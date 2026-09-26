package httpapi

import (
	"errors"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"strconv"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/jobs"
)

type jobResponse struct {
	ID      string           `json:"id"`
	Status  jobs.Status      `json:"status"`
	Error   string           `json:"error,omitempty"`
	Outputs []outputResponse `json:"outputs,omitempty"`
}

type outputResponse struct {
	Name        string `json:"name"`
	Size        int64  `json:"size"`
	ContentType string `json:"contentType"`
}

func (s *Server) submit(w http.ResponseWriter, r *http.Request) {
	spec, ok := s.specs[r.PathValue("tool")]
	if !ok {
		writeError(w, http.StatusNotFound, codeNotFound)
		return
	}
	if !s.limiter.Allow(s.clientIP(r)) {
		w.Header().Set("Retry-After", "30")
		writeError(w, http.StatusTooManyRequests, codeRateLimited)
		return
	}

	id, dir, err := s.jobs.Create(spec.ID)
	if errors.Is(err, jobs.ErrBusy) {
		w.Header().Set("Retry-After", "10")
		writeError(w, http.StatusServiceUnavailable, codeBusy)
		return
	}
	if err != nil {
		s.log.Error("create job", "err", err)
		writeError(w, http.StatusInternalServerError, codeBadRequest)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, s.opts.MaxUploadBytes)
	in, err := readUpload(r, dir, spec)
	if err != nil {
		s.jobs.Delete(id)
		var ue *uploadError
		if errors.As(err, &ue) {
			writeError(w, ue.status, ue.code)
			return
		}
		s.log.Warn("upload failed", "tool", spec.ID, "err", err)
		writeError(w, http.StatusBadRequest, codeBadRequest)
		return
	}

	s.jobs.Start(id, spec, in)
	writeJSON(w, http.StatusAccepted, jobResponse{ID: id, Status: jobs.StatusQueued})
}

func (s *Server) status(w http.ResponseWriter, r *http.Request) {
	snap, ok := s.jobs.Get(r.PathValue("id"))
	if !ok {
		writeError(w, http.StatusNotFound, codeNotFound)
		return
	}
	res := jobResponse{ID: snap.ID, Status: snap.Status, Error: snap.ErrorCode}
	for _, o := range snap.Outputs {
		var size int64
		if info, err := os.Stat(o.Path); err == nil {
			size = info.Size()
		}
		res.Outputs = append(res.Outputs, outputResponse{Name: o.Name, Size: size, ContentType: o.ContentType})
	}
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) download(w http.ResponseWriter, r *http.Request) {
	snap, ok := s.jobs.Get(r.PathValue("id"))
	index, err := strconv.Atoi(r.PathValue("index"))
	if !ok || err != nil || snap.Status != jobs.StatusDone || index < 0 || index >= len(snap.Outputs) {
		writeError(w, http.StatusNotFound, codeNotFound)
		return
	}
	out := snap.Outputs[index]
	f, err := os.Open(out.Path)
	if err != nil {
		writeError(w, http.StatusNotFound, codeNotFound)
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		writeError(w, http.StatusNotFound, codeNotFound)
		return
	}
	w.Header().Set("Content-Type", out.ContentType)
	w.Header().Set("Content-Disposition", contentDisposition(out.Name))
	http.ServeContent(w, r, "", info.ModTime(), f)
}

func (s *Server) remove(w http.ResponseWriter, r *http.Request) {
	s.jobs.Delete(r.PathValue("id"))
	w.WriteHeader(http.StatusNoContent)
}

// contentDisposition builds an attachment header that keeps non-ASCII (Turkish) names intact.
func contentDisposition(name string) string {
	if v := mime.FormatMediaType("attachment", map[string]string{"filename": name}); v != "" {
		return v
	}
	return fmt.Sprintf("attachment; filename*=UTF-8''%s", url.PathEscape(name))
}

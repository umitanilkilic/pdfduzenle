// Package httpapi exposes the public /api routes.
package httpapi

import (
	"encoding/json"
	"log/slog"
	"net"
	"net/http"
	"strings"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/jobs"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/tools"
)

// JobManager is what the HTTP layer needs from the job queue.
type JobManager interface {
	Create(tool string) (id, dir string, err error)
	Start(id string, spec tools.Spec, in tools.Input)
	Get(id string) (jobs.Snapshot, bool)
	Delete(id string)
}

// Limiter decides whether a client may submit another job.
type Limiter interface {
	Allow(key string) bool
}

type Options struct {
	MaxUploadBytes int64
	// TrustedProxyHops: see config.Config.
	TrustedProxyHops int
}

type Server struct {
	opts    Options
	log     *slog.Logger
	jobs    JobManager
	limiter Limiter
	specs   map[string]tools.Spec
	mux     *http.ServeMux
}

func New(opts Options, log *slog.Logger, specs []tools.Spec, jobs JobManager, limiter Limiter) *Server {
	s := &Server{opts: opts, log: log, jobs: jobs, limiter: limiter, specs: map[string]tools.Spec{}, mux: http.NewServeMux()}
	for _, spec := range specs {
		s.specs[spec.ID] = spec
	}
	s.mux.HandleFunc("GET /api/health", s.health)
	s.mux.HandleFunc("POST /api/tools/{tool}", s.submit)
	s.mux.HandleFunc("GET /api/jobs/{id}", s.status)
	s.mux.HandleFunc("GET /api/jobs/{id}/files/{index}", s.download)
	s.mux.HandleFunc("DELETE /api/jobs/{id}", s.remove)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cache-Control", "no-store")
	s.mux.ServeHTTP(w, r)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Error codes for HTTP-level failures (tool failures use tools.Code*).
const (
	codeNotFound        = "notFound"
	codeRateLimited     = "rateLimited"
	codeBusy            = "busy"
	codeTooLarge        = "tooLarge"
	codeUnsupportedType = "unsupportedType"
	codeTooManyFiles    = "tooManyFiles"
	codeNoFiles         = "noFiles"
	codeBadRequest      = "badRequest"
)

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code string) {
	writeJSON(w, status, map[string]string{"error": code})
}

// clientIP returns the caller's address. Behind N trusted proxies it takes the N-th X-Forwarded-For
// entry from the right: entries further left are client-supplied and could be spoofed.
func (s *Server) clientIP(r *http.Request) string {
	if hops := s.opts.TrustedProxyHops; hops > 0 {
		var chain []string
		for _, h := range r.Header.Values("X-Forwarded-For") {
			for _, ip := range strings.Split(h, ",") {
				if ip = strings.TrimSpace(ip); ip != "" {
					chain = append(chain, ip)
				}
			}
		}
		if len(chain) >= hops {
			return chain[len(chain)-hops]
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

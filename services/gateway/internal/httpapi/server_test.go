package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/jobs"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/tools"
)

// echoTool copies each input to an output and records the options it saw.
type echoTool struct{ seen chan map[string]string }

func (e echoTool) Process(_ context.Context, in tools.Input) ([]tools.Output, error) {
	if e.seen != nil {
		e.seen <- in.Options
	}
	var outs []tools.Output
	for i, f := range in.Files {
		data, _ := os.ReadFile(f.Path)
		out := filepath.Join(in.Dir, "out-"+string(rune('0'+i))+".pdf")
		_ = os.WriteFile(out, data, 0o600)
		outs = append(outs, tools.Output{Path: out, Name: f.Name, ContentType: "application/pdf"})
	}
	return outs, nil
}

type allowAll struct{ allow bool }

func (a allowAll) Allow(string) bool { return a.allow }

type fixture struct {
	srv  *Server
	jobs *jobs.Manager
	seen chan map[string]string
}

func newFixture(t *testing.T, limiter Limiter, maxPending int) fixture {
	t.Helper()
	m, err := jobs.New(jobs.Options{WorkDir: t.TempDir(), TTL: time.Hour, MaxPending: maxPending})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(m.Close)
	seen := make(chan map[string]string, 10)
	specs := []tools.Spec{{ID: "echo", Extensions: []string{".pdf"}, MaxFiles: 2, Timeout: time.Second, Pool: "p", Tool: echoTool{seen: seen}}}
	srv := New(Options{MaxUploadBytes: 1 << 20, TrustedProxyHops: 1}, slog.New(slog.DiscardHandler), specs, m, limiter)
	return fixture{srv: srv, jobs: m, seen: seen}
}

type part struct{ field, name, content string }

func multipartBody(t *testing.T, parts ...part) (*bytes.Buffer, string) {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	for _, p := range parts {
		if p.name != "" {
			fw, _ := w.CreateFormFile(p.field, p.name)
			_, _ = io.WriteString(fw, p.content)
		} else {
			_ = w.WriteField(p.field, p.content)
		}
	}
	_ = w.Close()
	return &buf, w.FormDataContentType()
}

func (f fixture) do(t *testing.T, method, path string, body io.Reader, contentType string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, body)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	f.srv.ServeHTTP(rec, req)
	return rec
}

func decode[T any](t *testing.T, rec *httptest.ResponseRecorder) T {
	t.Helper()
	var v T
	if err := json.Unmarshal(rec.Body.Bytes(), &v); err != nil {
		t.Fatalf("decode %q: %v", rec.Body.String(), err)
	}
	return v
}

func (f fixture) waitDone(t *testing.T, id string) jobResponse {
	t.Helper()
	for range 200 {
		res := decode[jobResponse](t, f.do(t, "GET", "/api/jobs/"+id, nil, ""))
		if res.Status == jobs.StatusDone || res.Status == jobs.StatusFailed {
			return res
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("job did not finish")
	return jobResponse{}
}

func TestHealth(t *testing.T) {
	f := newFixture(t, allowAll{true}, 10)
	if rec := f.do(t, "GET", "/api/health", nil, ""); rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
}

func TestSubmitPollDownload(t *testing.T) {
	f := newFixture(t, allowAll{true}, 10)
	body, ct := multipartBody(t, part{"files", "Yıllık Rapor.pdf", "%PDF-1.7 içerik"}, part{"level", "", "strong"})
	rec := f.do(t, "POST", "/api/tools/echo", body, ct)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("submit: %d %s", rec.Code, rec.Body)
	}
	job := decode[jobResponse](t, rec)
	if opts := <-f.seen; opts["level"] != "strong" {
		t.Fatalf("options = %v", opts)
	}

	done := f.waitDone(t, job.ID)
	if done.Status != jobs.StatusDone || len(done.Outputs) != 1 || done.Outputs[0].Size == 0 {
		t.Fatalf("job = %+v", done)
	}

	dl := f.do(t, "GET", "/api/jobs/"+job.ID+"/files/0", nil, "")
	if dl.Code != http.StatusOK || dl.Body.String() != "%PDF-1.7 içerik" {
		t.Fatalf("download: %d %q", dl.Code, dl.Body)
	}
	if cd := dl.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") || !strings.Contains(cd, "utf-8''Y%C4%B1ll%C4%B1k") {
		t.Fatalf("Content-Disposition = %q", cd)
	}
	if dl.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("responses must not be cached")
	}

	if rec := f.do(t, "DELETE", "/api/jobs/"+job.ID, nil, ""); rec.Code != http.StatusNoContent {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec := f.do(t, "GET", "/api/jobs/"+job.ID, nil, ""); rec.Code != http.StatusNotFound {
		t.Fatalf("after delete: %d", rec.Code)
	}
}

func TestSubmitValidation(t *testing.T) {
	cases := []struct {
		name   string
		parts  []part
		status int
		code   string
	}{
		{"no files", []part{{"level", "", "x"}}, 400, codeNoFiles},
		{"wrong extension", []part{{"files", "a.exe", "MZ"}}, 415, codeUnsupportedType},
		{"not a pdf", []part{{"files", "a.pdf", "hello"}}, 415, tools.CodeInvalidPDF},
		{"too many files", []part{{"files", "a.pdf", "%PDF-"}, {"files", "b.pdf", "%PDF-"}, {"files", "c.pdf", "%PDF-"}}, 400, codeTooManyFiles},
		{"too large", []part{{"files", "a.pdf", "%PDF-" + strings.Repeat("x", 2<<20)}}, 413, codeTooLarge},
		{"option too long", []part{{"files", "a.pdf", "%PDF-"}, {"x", "", strings.Repeat("y", 2000)}}, 400, codeBadRequest},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			f := newFixture(t, allowAll{true}, 10)
			body, ct := multipartBody(t, c.parts...)
			rec := f.do(t, "POST", "/api/tools/echo", body, ct)
			if rec.Code != c.status || decode[map[string]string](t, rec)["error"] != c.code {
				t.Fatalf("got %d %s, want %d %s", rec.Code, rec.Body, c.status, c.code)
			}
		})
	}
}

func TestSubmitUnknownToolRateLimitAndBusy(t *testing.T) {
	body, ct := multipartBody(t, part{"files", "a.pdf", "%PDF-"})
	if rec := newFixture(t, allowAll{true}, 10).do(t, "POST", "/api/tools/nope", body, ct); rec.Code != 404 {
		t.Fatalf("unknown tool: %d", rec.Code)
	}

	body, ct = multipartBody(t, part{"files", "a.pdf", "%PDF-"})
	rec := newFixture(t, allowAll{false}, 10).do(t, "POST", "/api/tools/echo", body, ct)
	if rec.Code != 429 || rec.Header().Get("Retry-After") == "" {
		t.Fatalf("rate limited: %d", rec.Code)
	}

	f := newFixture(t, allowAll{true}, 1)
	_, _, _ = f.jobs.Create("echo") // occupy the only slot
	body, ct = multipartBody(t, part{"files", "a.pdf", "%PDF-"})
	if rec := f.do(t, "POST", "/api/tools/echo", body, ct); rec.Code != 503 {
		t.Fatalf("busy: %d", rec.Code)
	}
}

func TestDownloadRejectsBadIndexes(t *testing.T) {
	f := newFixture(t, allowAll{true}, 10)
	body, ct := multipartBody(t, part{"files", "a.pdf", "%PDF-"})
	job := decode[jobResponse](t, f.do(t, "POST", "/api/tools/echo", body, ct))
	f.waitDone(t, job.ID)
	for _, idx := range []string{"1", "-1", "x"} {
		if rec := f.do(t, "GET", "/api/jobs/"+job.ID+"/files/"+idx, nil, ""); rec.Code != http.StatusNotFound {
			t.Errorf("index %q: %d", idx, rec.Code)
		}
	}
	// Traversal attempts are cleaned by ServeMux (redirect to a non-existent route), never served.
	if rec := f.do(t, "GET", "/api/jobs/"+job.ID+"/files/../../../../etc/passwd", nil, ""); rec.Code == http.StatusOK {
		t.Errorf("traversal served a file: %q", rec.Body)
	}
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		hops int
		xff  string
		want string
	}{
		{1, "203.0.113.7", "203.0.113.7"},
		{1, "6.6.6.6, 203.0.113.7", "203.0.113.7"},           // spoofed entry on the left is ignored
		{2, "6.6.6.6, 203.0.113.7, 10.0.0.9", "203.0.113.7"}, // reverse proxy → Next → gateway
		{2, "203.0.113.7", "10.0.0.2"},                       // fewer hops than expected: use the peer
		{0, "203.0.113.7", "10.0.0.2"},                       // header not trusted
	}
	for _, c := range cases {
		s := &Server{opts: Options{TrustedProxyHops: c.hops}}
		r := httptest.NewRequest("GET", "/", nil)
		r.RemoteAddr = "10.0.0.2:1234"
		r.Header.Set("X-Forwarded-For", c.xff)
		if got := s.clientIP(r); got != c.want {
			t.Errorf("hops=%d xff=%q: got %q, want %q", c.hops, c.xff, got, c.want)
		}
	}
}

func TestCleanName(t *testing.T) {
	for in, want := range map[string]string{
		"../../etc/passwd":     "passwd",
		`C:\Users\a\rapor.pdf`: "rapor.pdf",
		"Yıllık\x00Rapor.pdf":  "YıllıkRapor.pdf",
		"":                     "document",
	} {
		if got := cleanName(in); got != want {
			t.Errorf("cleanName(%q) = %q, want %q", in, got, want)
		}
	}
}

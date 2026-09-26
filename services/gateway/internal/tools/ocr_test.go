package tools

import (
	"context"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// fakeOCRService checks the forwarded request and replies with status/body.
func fakeOCRService(t *testing.T, status int, body string, seen map[string]string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/internal/ocr" {
			t.Errorf("path = %s", r.URL.Path)
		}
		_, params, _ := mime.ParseMediaType(r.Header.Get("Content-Type"))
		mr := multipart.NewReader(r.Body, params["boundary"])
		for {
			p, err := mr.NextPart()
			if err != nil {
				break
			}
			data, _ := io.ReadAll(p)
			if p.FormName() == "file" {
				seen["file"] = string(data)
				seen["filename"] = p.FileName()
			} else {
				seen[p.FormName()] = string(data)
			}
		}
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func ocrInput(t *testing.T, opts map[string]string) Input {
	dir := t.TempDir()
	path := filepath.Join(dir, "in-0.png")
	_ = os.WriteFile(path, []byte("PNGDATA"), 0o600)
	return Input{Dir: dir, Files: []File{{Path: path, Name: "tarama.png"}}, Options: opts}
}

func TestOCRForwardsFileAndOptions(t *testing.T) {
	seen := map[string]string{}
	srv := fakeOCRService(t, 200, "docx-bytes", seen)
	out, err := OCR{Client: srv.Client(), BaseURL: srv.URL}.Process(context.Background(), ocrInput(t, map[string]string{"output": "docx", "engine": "fast"}))
	if err != nil {
		t.Fatal(err)
	}
	if seen["file"] != "PNGDATA" || seen["filename"] != "in-0.png" || seen["output"] != "docx" || seen["engine"] != "fast" || seen["languages"] != "tur+eng" {
		t.Fatalf("forwarded %v", seen)
	}
	data, _ := os.ReadFile(out[0].Path)
	if string(data) != "docx-bytes" || out[0].Name != "tarama.docx" || out[0].ContentType != mimeDOCX {
		t.Fatalf("output %+v %q", out[0], data)
	}
}

func TestOCRValidatesOptions(t *testing.T) {
	for _, opts := range []map[string]string{{"output": "html"}, {"engine": "gpu"}, {"languages": "deu"}} {
		_, err := OCR{Client: http.DefaultClient, BaseURL: "http://unused"}.Process(context.Background(), ocrInput(t, opts))
		if CodeOf(err) != CodeInvalidOption {
			t.Errorf("%v: code = %q", opts, CodeOf(err))
		}
	}
}

func TestOCRMapsServiceErrors(t *testing.T) {
	cases := map[string]string{
		`{"error":"tooManyPages"}`: CodeTooManyPages,
		`{"error":"encrypted"}`:    CodeEncrypted,
		`{"error":"weird"}`:        CodeConversionFailed,
		`<html>`:                   CodeConversionFailed,
	}
	for body, want := range cases {
		srv := fakeOCRService(t, 400, body, map[string]string{})
		_, err := OCR{Client: srv.Client(), BaseURL: srv.URL}.Process(context.Background(), ocrInput(t, nil))
		if CodeOf(err) != want {
			t.Errorf("%s: code = %q, want %q", body, CodeOf(err), want)
		}
	}
}

func TestOCRServiceDown(t *testing.T) {
	_, err := OCR{Client: http.DefaultClient, BaseURL: "http://127.0.0.1:9"}.Process(context.Background(), ocrInput(t, nil))
	if CodeOf(err) != CodeConversionFailed {
		t.Fatalf("code = %q", CodeOf(err))
	}
}

package tools

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
)

// These tests run the real programs and are skipped where they are not installed.

func requireBinary(t *testing.T, names ...string) {
	t.Helper()
	for _, n := range names {
		if _, err := exec.LookPath(n); err != nil {
			t.Skipf("%s not installed", n)
		}
	}
}

func copyFixture(t *testing.T, name string) Input {
	t.Helper()
	dir := t.TempDir()
	data, err := os.ReadFile(filepath.Join("testdata", name))
	if err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dir, "in-0"+filepath.Ext(name))
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	return Input{Dir: dir, Files: []File{{Path: path, Name: name}}, Options: map[string]string{}}
}

// nextJob copies a previous output into a fresh job directory.
func nextJob(t *testing.T, path string) Input {
	t.Helper()
	dir := t.TempDir()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	in := filepath.Join(dir, "in-0.pdf")
	if err := os.WriteFile(in, data, 0o600); err != nil {
		t.Fatal(err)
	}
	return Input{Dir: dir, Files: []File{{Path: in, Name: "a.pdf"}}, Options: map[string]string{}}
}

func ctx(t *testing.T) context.Context {
	c, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	t.Cleanup(cancel)
	return c
}

func readHead(t *testing.T, path string, n int) []byte {
	t.Helper()
	b, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return b[:min(n, len(b))]
}

func TestIntegrationCompressShrinks(t *testing.T) {
	requireBinary(t, "gs", "qpdf")
	in := copyFixture(t, "sample.pdf")
	out, err := Compress{Runner: runner.Exec{}}.Process(ctx(t), in)
	if err != nil {
		t.Fatal(err)
	}
	before, _ := os.Stat(in.Files[0].Path)
	after, _ := os.Stat(out[0].Path)
	if after.Size() >= before.Size() {
		t.Fatalf("not smaller: %d → %d", before.Size(), after.Size())
	}
}

func TestIntegrationProtectThenUnlock(t *testing.T) {
	requireBinary(t, "qpdf")
	in := copyFixture(t, "sample.pdf")
	in.Options = map[string]string{"password": "Şifre 123"}
	locked, err := Protect{Runner: runner.Exec{}}.Process(ctx(t), in)
	if err != nil {
		t.Fatal(err)
	}
	if yes, _ := RequiresPassword(ctx(t), runner.Exec{}, in.Dir, locked[0].Path); !yes {
		t.Fatal("output is not password protected")
	}

	// Each job has its own directory, like in production.
	wrong := nextJob(t, locked[0].Path)
	wrong.Options = map[string]string{"password": "nope"}
	if _, err := (Unlock{Runner: runner.Exec{}}).Process(ctx(t), wrong); CodeOf(err) != CodeWrongPassword {
		t.Fatalf("wrong password: code = %q (%v)", CodeOf(err), err)
	}

	// Right password (Turkish characters included).
	right := nextJob(t, locked[0].Path)
	right.Options = map[string]string{"password": "Şifre 123"}
	open, err := Unlock{Runner: runner.Exec{}}.Process(ctx(t), right)
	if err != nil {
		t.Fatal(err)
	}
	if yes, _ := RequiresPassword(ctx(t), runner.Exec{}, right.Dir, open[0].Path); yes {
		t.Fatal("output still requires a password")
	}
}

func TestIntegrationCompressRejectsEncrypted(t *testing.T) {
	requireBinary(t, "qpdf", "gs")
	in := copyFixture(t, "sample.pdf")
	in.Options = map[string]string{"password": "x"}
	locked, err := Protect{Runner: runner.Exec{}}.Process(ctx(t), in)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := (Compress{Runner: runner.Exec{}}).Process(ctx(t), nextJob(t, locked[0].Path)); CodeOf(err) != CodeEncrypted {
		t.Fatalf("code = %q, want encrypted", CodeOf(err))
	}
}

func TestIntegrationRepairTruncatedFile(t *testing.T) {
	requireBinary(t, "qpdf")
	in := copyFixture(t, "sample.pdf")
	data, _ := os.ReadFile(in.Files[0].Path)
	// Drop the cross-reference table and trailer.
	cut := bytes.LastIndex(data, []byte("xref"))
	_ = os.WriteFile(in.Files[0].Path, data[:cut], 0o600)
	out, err := Repair{Runner: runner.Exec{}}.Process(ctx(t), in)
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(readHead(t, out[0].Path, 5), []byte("%PDF-")) {
		t.Fatal("repaired output is not a PDF")
	}
}

func TestIntegrationPDFA(t *testing.T) {
	requireBinary(t, "gs", "qpdf")
	defs, _ := filepath.Glob("/usr/share/ghostscript/*/lib/PDFA_def.ps")
	icc := "/usr/share/color/icc/ghostscript/srgb.icc"
	if len(defs) == 0 {
		t.Skip("PDFA_def.ps not found")
	}
	if _, err := os.Stat(icc); err != nil {
		t.Skip("sRGB profile not found")
	}
	out, err := PDFA{Runner: runner.Exec{}, DefTemplate: defs[0], ICCProfile: icc}.Process(ctx(t), copyFixture(t, "sample.pdf"))
	if err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(out[0].Path)
	for _, marker := range []string{"GTS_PDFA1", "pdfaid:part"} {
		if !bytes.Contains(data, []byte(marker)) {
			t.Errorf("output lacks %s", marker)
		}
	}
}

// A document may reference URLs (images, frames); converting it must not make the server fetch them.
func TestIntegrationOfficeDoesNotFetchLinkedURLs(t *testing.T) {
	requireBinary(t, "soffice")
	var hits atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		hits.Add(1)
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	dir := t.TempDir()
	path := filepath.Join(dir, "in-0.doc")
	html := `<html><body><p>Merhaba</p><img src="` + srv.URL + `/ssrf.png"><iframe src="` + srv.URL + `/frame"></iframe></body></html>`
	if err := os.WriteFile(path, []byte(html), 0o600); err != nil {
		t.Fatal(err)
	}
	out, err := Office{Runner: runner.Exec{}, Target: "pdf"}.Process(ctx(t), Input{Dir: dir, Files: []File{{Path: path, Name: "evil.doc"}}})
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(readHead(t, out[0].Path, 5), []byte("%PDF-")) {
		t.Fatal("conversion should still produce a PDF")
	}
	if n := hits.Load(); n != 0 {
		t.Fatalf("LibreOffice made %d request(s) to a URL in the document (SSRF)", n)
	}
}

func TestIntegrationOfficeToPDFAndBack(t *testing.T) {
	requireBinary(t, "soffice")
	pdf, err := Office{Runner: runner.Exec{}, Target: "pdf"}.Process(ctx(t), copyFixture(t, "sample.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if pdf[0].Name != "sample.pdf" || !bytes.HasPrefix(readHead(t, pdf[0].Path, 5), []byte("%PDF-")) {
		t.Fatalf("bad PDF output: %+v", pdf[0])
	}

	docx, err := Office{Runner: runner.Exec{}, Target: "docx", ImportFilter: "writer_pdf_import"}.Process(ctx(t), copyFixture(t, "sample.pdf"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(readHead(t, docx[0].Path, 2), []byte("PK")) || docx[0].ContentType != mimeDOCX {
		t.Fatalf("bad DOCX output: %+v", docx[0])
	}
}

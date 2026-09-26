package tools

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
)

// fakeRunner records commands and answers with a scripted result.
type fakeRunner struct {
	calls  []runner.Command
	answer func(runner.Command) (runner.Result, error)
}

func (f *fakeRunner) Run(_ context.Context, c runner.Command) (runner.Result, error) {
	f.calls = append(f.calls, c)
	if f.answer == nil {
		return runner.Result{}, nil
	}
	return f.answer(c)
}

func exitWith(code int, stderr string) error {
	return &runner.ExitError{Command: "x", Result: runner.Result{ExitCode: code, Stderr: stderr}}
}

// notEncrypted answers `qpdf --requires-password` with exit 2 and everything else with success.
func notEncrypted(c runner.Command) (runner.Result, error) {
	if len(c.Args) > 0 && c.Args[0] == "--requires-password" {
		return runner.Result{}, exitWith(2, "")
	}
	return runner.Result{}, nil
}

func oneFile(t *testing.T, opts map[string]string) Input {
	dir := t.TempDir()
	path := dir + "/in-0.pdf"
	if err := os.WriteFile(path, []byte("%PDF-1.7"), 0o600); err != nil {
		t.Fatal(err)
	}
	return Input{Dir: dir, Files: []File{{Path: path, Name: "rapor.pdf"}}, Options: opts}
}

func TestProtectKeepsPasswordOutOfArguments(t *testing.T) {
	r := &fakeRunner{answer: notEncrypted}
	in := oneFile(t, map[string]string{"password": "gizli-şifre", "allowPrint": "false"})
	out, err := Protect{Runner: r}.Process(context.Background(), in)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 || out[0].Name != "rapor.pdf" {
		t.Fatalf("outputs = %+v", out)
	}
	for _, c := range r.calls {
		if strings.Contains(strings.Join(c.Args, " "), "gizli") {
			t.Fatalf("password leaked into argv: %v", c.Args)
		}
	}
	last := r.calls[len(r.calls)-1]
	argFile := strings.TrimPrefix(last.Args[0], "@")
	content, err := os.ReadFile(argFile)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"--user-password=gizli-şifre", "--bits=256", "--print=none"} {
		if !strings.Contains(string(content), want) {
			t.Errorf("arg file missing %q", want)
		}
	}
	if info, _ := os.Stat(argFile); info.Mode().Perm() != 0o600 {
		t.Errorf("arg file mode = %v, want 0600", info.Mode().Perm())
	}
}

func TestProtectValidatesPassword(t *testing.T) {
	for _, pw := range []string{"", strings.Repeat("a", 129), "a\nb"} {
		_, err := Protect{Runner: &fakeRunner{}}.Process(context.Background(), oneFile(t, map[string]string{"password": pw}))
		if CodeOf(err) != CodeInvalidOption {
			t.Errorf("password %q: code = %q", pw, CodeOf(err))
		}
	}
}

func TestProtectRejectsEncryptedInput(t *testing.T) {
	_, err := Protect{Runner: &fakeRunner{}}.Process(context.Background(), oneFile(t, map[string]string{"password": "x"}))
	if CodeOf(err) != CodeEncrypted {
		t.Fatalf("code = %q, want encrypted", CodeOf(err))
	}
}

func TestUnlockWrongPassword(t *testing.T) {
	r := &fakeRunner{answer: func(runner.Command) (runner.Result, error) {
		return runner.Result{}, exitWith(2, "qpdf: in.pdf: invalid password")
	}}
	_, err := Unlock{Runner: r}.Process(context.Background(), oneFile(t, map[string]string{"password": "yanlis"}))
	if CodeOf(err) != CodeWrongPassword {
		t.Fatalf("code = %q, want wrongPassword", CodeOf(err))
	}
}

func TestRepairAcceptsWarnings(t *testing.T) {
	r := &fakeRunner{answer: func(runner.Command) (runner.Result, error) { return runner.Result{}, exitWith(3, "warning") }}
	if _, err := (Repair{Runner: r}).Process(context.Background(), oneFile(t, nil)); err != nil {
		t.Fatalf("exit code 3 must count as success: %v", err)
	}
}

func TestCompressLevels(t *testing.T) {
	cases := map[string]string{"": "/ebook", "low": "/printer", "recommended": "/ebook", "strong": "/screen"}
	for level, preset := range cases {
		r := &fakeRunner{answer: func(c runner.Command) (runner.Result, error) {
			if c.Name == "gs" {
				// Pretend Ghostscript wrote a smaller file.
				for _, a := range c.Args {
					if out, ok := strings.CutPrefix(a, "-sOutputFile="); ok {
						_ = os.WriteFile(out, []byte("%PDF"), 0o600)
					}
				}
			}
			return notEncrypted(c)
		}}
		if _, err := (Compress{Runner: r}).Process(context.Background(), oneFile(t, map[string]string{"level": level})); err != nil {
			t.Fatalf("level %q: %v", level, err)
		}
		gs := r.calls[len(r.calls)-1]
		if !contains(gs.Args, "-dPDFSETTINGS="+preset) || !contains(gs.Args, "-dSAFER") {
			t.Errorf("level %q: args = %v", level, gs.Args)
		}
	}
	_, err := Compress{Runner: &fakeRunner{answer: notEncrypted}}.Process(context.Background(), oneFile(t, map[string]string{"level": "max"}))
	if CodeOf(err) != CodeInvalidOption {
		t.Fatalf("unknown level: code = %q", CodeOf(err))
	}
}

func TestKeepSmallerRestoresOriginal(t *testing.T) {
	dir := t.TempDir()
	orig, out := dir+"/a.pdf", dir+"/b.pdf"
	_ = os.WriteFile(orig, []byte("small"), 0o600)
	_ = os.WriteFile(out, []byte("much larger output"), 0o600)
	if err := keepSmaller(orig, out); err != nil {
		t.Fatal(err)
	}
	if b, _ := os.ReadFile(out); string(b) != "small" {
		t.Fatalf("out = %q, want original", b)
	}
}

func TestCodeOf(t *testing.T) {
	if CodeOf(errors.New("boom")) != CodeConversionFailed {
		t.Fatal("plain errors must map to conversionFailed")
	}
	if CodeOf(newError(CodeEncrypted, nil)) != CodeEncrypted {
		t.Fatal("wrapped code lost")
	}
}

func TestOutputName(t *testing.T) {
	for in, want := range map[string]string{"rapor.docx": "rapor.pdf", "a.b.xlsx": "a.b.pdf", ".docx": "document.pdf"} {
		if got := outputName(in, "pdf"); got != want {
			t.Errorf("outputName(%q) = %q, want %q", in, got, want)
		}
	}
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

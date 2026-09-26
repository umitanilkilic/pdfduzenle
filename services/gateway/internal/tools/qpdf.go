package tools

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
)

// qpdf exit codes: 0 ok, 2 error, 3 warnings (output still written).
const qpdfWarnings = 3

// runQpdf runs qpdf with arguments read from a private argument file (keeps passwords out of `ps`).
func runQpdf(ctx context.Context, r runner.Runner, dir string, args []string) (runner.Result, error) {
	argFile, err := writeSecret(dir, fmt.Sprintf(".qpdf-args-%s", randomHex(4)), strings.Join(args, "\n"))
	if err != nil {
		return runner.Result{}, err
	}
	res, err := r.Run(ctx, runner.Command{Name: "qpdf", Args: []string{"@" + argFile}, Dir: dir})
	var exitErr *runner.ExitError
	if errors.As(err, &exitErr) && exitErr.Result.ExitCode == qpdfWarnings {
		return exitErr.Result, nil
	}
	return res, err
}

// RequiresPassword reports whether a PDF needs a password to open.
func RequiresPassword(ctx context.Context, r runner.Runner, dir, path string) (bool, error) {
	_, err := r.Run(ctx, runner.Command{Name: "qpdf", Args: []string{"--requires-password", path}, Dir: dir})
	if err == nil {
		return true, nil // exit 0: a password is required
	}
	var exitErr *runner.ExitError
	if errors.As(err, &exitErr) {
		return false, nil // 2: not encrypted, 3: encrypted without a user password
	}
	return false, err
}

func ensureOpenable(ctx context.Context, r runner.Runner, dir, path string) error {
	locked, err := RequiresPassword(ctx, r, dir, path)
	if err != nil {
		return err
	}
	if locked {
		return newError(CodeEncrypted, nil)
	}
	return nil
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Protect encrypts PDFs with AES-256.
type Protect struct{ Runner runner.Runner }

func (t Protect) Process(ctx context.Context, in Input) ([]Output, error) {
	password := in.Options["password"]
	if password == "" || len(password) > 128 || strings.ContainsAny(password, "\r\n") {
		return nil, newError(CodeInvalidOption, errors.New("password must be 1–128 characters on one line"))
	}
	// A random owner password keeps the permission restrictions enforceable.
	owner := randomHex(16)
	var outputs []Output
	for i, f := range in.Files {
		if err := ensureOpenable(ctx, t.Runner, in.Dir, f.Path); err != nil {
			return nil, err
		}
		out := outputPath(in.Dir, i, "pdf")
		args := []string{"--encrypt", "--user-password=" + password, "--owner-password=" + owner, "--bits=256"}
		if in.Options["allowPrint"] == "false" {
			args = append(args, "--print=none")
		}
		if in.Options["allowCopy"] == "false" {
			args = append(args, "--extract=n")
		}
		args = append(args, "--", f.Path, out)
		if _, err := runQpdf(ctx, t.Runner, in.Dir, args); err != nil {
			return nil, newError(CodeConversionFailed, err)
		}
		outputs = append(outputs, Output{Path: out, Name: outputName(f.Name, "pdf"), ContentType: mimePDF})
	}
	return outputs, nil
}

// Unlock removes encryption from PDFs whose password the user knows.
type Unlock struct{ Runner runner.Runner }

func (t Unlock) Process(ctx context.Context, in Input) ([]Output, error) {
	password := in.Options["password"]
	if len(password) > 128 || strings.ContainsAny(password, "\r\n") {
		return nil, newError(CodeInvalidOption, errors.New("invalid password"))
	}
	pwFile, err := writeSecret(in.Dir, ".password", password)
	if err != nil {
		return nil, err
	}
	var outputs []Output
	for i, f := range in.Files {
		out := outputPath(in.Dir, i, "pdf")
		_, err := runQpdf(ctx, t.Runner, in.Dir, []string{"--password-file=" + pwFile, "--decrypt", f.Path, out})
		var exitErr *runner.ExitError
		if errors.As(err, &exitErr) && strings.Contains(strings.ToLower(exitErr.Result.Stderr), "invalid password") {
			return nil, newError(CodeWrongPassword, err)
		}
		if err != nil {
			return nil, newError(CodeInvalidPDF, err)
		}
		outputs = append(outputs, Output{Path: out, Name: outputName(f.Name, "pdf"), ContentType: mimePDF})
	}
	return outputs, nil
}

// Repair rebuilds a damaged PDF's structure.
type Repair struct{ Runner runner.Runner }

func (t Repair) Process(ctx context.Context, in Input) ([]Output, error) {
	var outputs []Output
	for i, f := range in.Files {
		out := outputPath(in.Dir, i, "pdf")
		if _, err := runQpdf(ctx, t.Runner, in.Dir, []string{f.Path, out}); err != nil {
			if locked, _ := RequiresPassword(ctx, t.Runner, in.Dir, f.Path); locked {
				return nil, newError(CodeEncrypted, err)
			}
			return nil, newError(CodeInvalidPDF, err)
		}
		outputs = append(outputs, Output{Path: out, Name: outputName(f.Name, "pdf"), ContentType: mimePDF})
	}
	return outputs, nil
}

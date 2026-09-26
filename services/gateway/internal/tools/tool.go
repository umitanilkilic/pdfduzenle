// Package tools implements the server-side PDF tools on top of command-line programs.
package tools

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Input is one job: files already stored inside Dir, plus user options.
type Input struct {
	Dir     string
	Files   []File
	Options map[string]string
}

type File struct {
	// Path on disk (inside Input.Dir).
	Path string
	// Name as uploaded by the user, used only for naming outputs.
	Name string
}

type Output struct {
	Path        string
	Name        string
	ContentType string
}

// Tool turns input files into output files.
type Tool interface {
	Process(ctx context.Context, in Input) ([]Output, error)
}

// Spec describes how the HTTP layer and the job queue treat a tool.
type Spec struct {
	ID         string
	Extensions []string
	MaxFiles   int
	Timeout    time.Duration
	// Pool names the concurrency pool; tools sharing a program share a pool.
	Pool string
	Tool Tool
}

// Error codes returned to clients. They map to translated messages in the web app.
const (
	CodeEncrypted        = "encrypted"
	CodeWrongPassword    = "wrongPassword"
	CodeInvalidPDF       = "invalidPdf"
	CodeInvalidOption    = "invalidOption"
	CodeConversionFailed = "conversionFailed"
	CodeTooManyPages     = "tooManyPages"
)

// Error is a failure the user can act on.
type Error struct {
	Code string
	Err  error
}

func (e *Error) Error() string {
	if e.Err == nil {
		return e.Code
	}
	return e.Code + ": " + e.Err.Error()
}

func (e *Error) Unwrap() error { return e.Err }

func newError(code string, err error) error { return &Error{Code: code, Err: err} }

// CodeOf extracts the client-facing code of an error, defaulting to conversionFailed.
func CodeOf(err error) string {
	var te *Error
	if errors.As(err, &te) {
		return te.Code
	}
	return CodeConversionFailed
}

const (
	mimePDF  = "application/pdf"
	mimeDOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

// outputPath returns a unique path in dir for the i-th output with the given extension.
func outputPath(dir string, i int, ext string) string {
	return filepath.Join(dir, fmt.Sprintf("out-%d.%s", i, ext))
}

// outputName renames an uploaded file to a new extension: "rapor.docx" → "rapor.pdf".
func outputName(original, ext string) string {
	base := strings.TrimSuffix(original, filepath.Ext(original))
	if base == "" {
		base = "document"
	}
	return base + "." + ext
}

// writeSecret stores a secret (password) in a private file so it never appears in process arguments.
func writeSecret(dir, name, content string) (string, error) {
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte(content+"\n"), 0o600); err != nil {
		return "", fmt.Errorf("write %s: %w", name, err)
	}
	return path, nil
}

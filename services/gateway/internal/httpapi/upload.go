package httpapi

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/tools"
)

const (
	maxOptionFields = 20
	maxOptionBytes  = 1 << 10
	maxNameLength   = 200
)

type uploadError struct {
	status int
	code   string
}

func (e *uploadError) Error() string { return e.code }

func badUpload(status int, code string) error { return &uploadError{status: status, code: code} }

// readUpload streams a multipart request into dir: "files" parts become inputs, other fields options.
func readUpload(r *http.Request, dir string, spec tools.Spec) (tools.Input, error) {
	in := tools.Input{Dir: dir, Options: map[string]string{}}
	mr, err := r.MultipartReader()
	if err != nil {
		return in, badUpload(http.StatusBadRequest, codeBadRequest)
	}

	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return in, classifyReadError(err)
		}

		if part.FormName() == "files" {
			if len(in.Files) >= spec.MaxFiles {
				return in, badUpload(http.StatusBadRequest, codeTooManyFiles)
			}
			file, err := saveFile(part, dir, len(in.Files), spec.Extensions)
			if err != nil {
				return in, err
			}
			in.Files = append(in.Files, file)
			continue
		}

		if len(in.Options) >= maxOptionFields {
			return in, badUpload(http.StatusBadRequest, codeBadRequest)
		}
		value, err := io.ReadAll(io.LimitReader(part, maxOptionBytes+1))
		if err != nil {
			return in, classifyReadError(err)
		}
		if len(value) > maxOptionBytes || !utf8.Valid(value) {
			return in, badUpload(http.StatusBadRequest, codeBadRequest)
		}
		in.Options[part.FormName()] = string(value)
	}

	if len(in.Files) == 0 {
		return in, badUpload(http.StatusBadRequest, codeNoFiles)
	}
	return in, nil
}

func saveFile(part *multipart.Part, dir string, index int, allowed []string) (tools.File, error) {
	name := cleanName(part.FileName())
	ext := strings.ToLower(filepath.Ext(name))
	if !slices.Contains(allowed, ext) {
		return tools.File{}, badUpload(http.StatusUnsupportedMediaType, codeUnsupportedType)
	}

	// Never use the client's name on disk.
	path := filepath.Join(dir, fmt.Sprintf("in-%d%s", index, ext))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return tools.File{}, err
	}
	defer f.Close()

	reader := bufio.NewReader(part)
	if ext == ".pdf" {
		head, _ := reader.Peek(1024)
		if !looksLikePDF(head) {
			return tools.File{}, badUpload(http.StatusUnsupportedMediaType, tools.CodeInvalidPDF)
		}
	}
	if _, err := io.Copy(f, reader); err != nil {
		return tools.File{}, classifyReadError(err)
	}
	return tools.File{Path: path, Name: name}, nil
}

// looksLikePDF accepts a PDF header within the first KB (as readers do) but rejects PostScript and EPS
// dressed up as PDF: Ghostscript would otherwise run them as programs.
func looksLikePDF(head []byte) bool {
	i := bytes.Index(head, []byte("%PDF-"))
	if i < 0 {
		return false
	}
	prefix := head[:i]
	return !bytes.Contains(prefix, []byte("%!")) && !bytes.HasPrefix(head, []byte{0xC5, 0xD0, 0xD3, 0xC6})
}

// cleanName keeps only the base name, without control characters, for naming outputs.
func cleanName(name string) string {
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.Map(func(r rune) rune {
		if r < 0x20 || r == 0x7f {
			return -1
		}
		return r
	}, name)
	if !utf8.ValidString(name) || name == "." || name == "/" {
		name = "document"
	}
	if len(name) > maxNameLength {
		ext := filepath.Ext(name)
		name = name[:maxNameLength-len(ext)] + ext
	}
	return name
}

func classifyReadError(err error) error {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		return badUpload(http.StatusRequestEntityTooLarge, codeTooLarge)
	}
	return err
}

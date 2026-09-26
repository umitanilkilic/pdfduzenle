package tools

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"slices"
)

// HTTPDoer is the part of *http.Client the OCR tool needs.
type HTTPDoer interface {
	Do(*http.Request) (*http.Response, error)
}

// OCR forwards a scan to the internal OCR service (Unlimited-OCR with Tesseract fallback).
type OCR struct {
	Client  HTTPDoer
	BaseURL string
}

var (
	ocrOutputs   = map[string]string{"pdf": mimePDF, "txt": "text/plain; charset=utf-8", "docx": mimeDOCX}
	ocrEngines   = []string{"auto", "fast"}
	ocrLanguages = []string{"tur", "eng", "tur+eng"}
)

func (t OCR) Process(ctx context.Context, in Input) ([]Output, error) {
	opts := map[string]string{"output": "pdf", "engine": "auto", "languages": "tur+eng"}
	for k := range opts {
		if v := in.Options[k]; v != "" {
			opts[k] = v
		}
	}
	if _, ok := ocrOutputs[opts["output"]]; !ok || !slices.Contains(ocrEngines, opts["engine"]) ||
		!slices.Contains(ocrLanguages, opts["languages"]) {
		return nil, newError(CodeInvalidOption, fmt.Errorf("options %v", opts))
	}
	if len(in.Files) != 1 {
		return nil, newError(CodeInvalidOption, errors.New("exactly one file"))
	}
	f := in.Files[0]

	res, err := t.post(ctx, f.Path, opts)
	if err != nil {
		return nil, newError(CodeConversionFailed, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, serviceError(res)
	}

	ext := opts["output"]
	out := outputPath(in.Dir, 0, ext)
	if err := writeBody(out, res.Body); err != nil {
		return nil, err
	}
	return []Output{{Path: out, Name: outputName(f.Name, ext), ContentType: ocrOutputs[ext]}}, nil
}

// post streams the file as multipart without buffering it in memory.
func (t OCR) post(ctx context.Context, path string, opts map[string]string) (*http.Response, error) {
	pr, pw := io.Pipe()
	mw := multipart.NewWriter(pw)
	go func() {
		pw.CloseWithError(writeForm(mw, path, opts))
	}()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, t.BaseURL+"/internal/ocr", pr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return t.Client.Do(req)
}

func writeForm(mw *multipart.Writer, path string, opts map[string]string) error {
	for k, v := range opts {
		if err := mw.WriteField(k, v); err != nil {
			return err
		}
	}
	src, err := os.Open(path)
	if err != nil {
		return err
	}
	defer src.Close()
	part, err := mw.CreateFormFile("file", filepath.Base(path))
	if err != nil {
		return err
	}
	if _, err := io.Copy(part, src); err != nil {
		return err
	}
	return mw.Close()
}

func writeBody(path string, body io.Reader) error {
	out, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, body); err != nil {
		out.Close()
		return newError(CodeConversionFailed, err)
	}
	return out.Close()
}

// serviceError maps the OCR service's {"error": code} body to a tool error.
func serviceError(res *http.Response) error {
	var body struct {
		Error string `json:"error"`
	}
	_ = json.NewDecoder(io.LimitReader(res.Body, 4096)).Decode(&body)
	switch body.Error {
	case CodeEncrypted, CodeInvalidPDF, CodeInvalidOption, CodeTooManyPages:
		return newError(body.Error, fmt.Errorf("ocr service: %d", res.StatusCode))
	}
	return newError(CodeConversionFailed, fmt.Errorf("ocr service: %d %s", res.StatusCode, body.Error))
}

package tools

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
)

// Office converts documents with LibreOffice in headless mode.
type Office struct {
	Runner runner.Runner
	// Target is the output extension: "pdf" or "docx".
	Target string
	// ImportFilter forces an input filter, e.g. "writer_pdf_import" to open PDFs in Writer.
	ImportFilter string
}

func (t Office) Process(ctx context.Context, in Input) ([]Output, error) {
	// A private profile per job lets conversions run in parallel.
	profile := "file://" + filepath.Join(in.Dir, "lo-profile")
	var outputs []Output
	for i, f := range in.Files {
		outDir := filepath.Join(in.Dir, fmt.Sprintf("lo-out-%d", i))
		if err := os.MkdirAll(outDir, 0o700); err != nil {
			return nil, err
		}
		args := []string{"-env:UserInstallation=" + profile, "--headless", "--norestore", "--nolockcheck"}
		if t.ImportFilter != "" {
			args = append(args, "--infilter="+t.ImportFilter)
		}
		args = append(args, "--convert-to", t.convertTo(), "--outdir", outDir, f.Path)
		if _, err := t.Runner.Run(ctx, runner.Command{Name: "soffice", Args: args, Dir: in.Dir}); err != nil {
			return nil, newError(CodeConversionFailed, err)
		}

		// LibreOffice names the result after the input file.
		produced := filepath.Join(outDir, strings.TrimSuffix(filepath.Base(f.Path), filepath.Ext(f.Path))+"."+t.Target)
		if _, err := os.Stat(produced); err != nil {
			return nil, newError(CodeConversionFailed, fmt.Errorf("no output produced for %s", f.Name))
		}
		out := outputPath(in.Dir, i, t.Target)
		if err := os.Rename(produced, out); err != nil {
			return nil, err
		}
		outputs = append(outputs, Output{Path: out, Name: outputName(f.Name, t.Target), ContentType: contentType(t.Target)})
	}
	return outputs, nil
}

func (t Office) convertTo() string {
	if t.Target == "docx" {
		return "docx:MS Word 2007 XML"
	}
	return t.Target
}

func contentType(ext string) string {
	if ext == "docx" {
		return mimeDOCX
	}
	return mimePDF
}

package tools

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
)

var gsBaseArgs = []string{"-dSAFER", "-dBATCH", "-dNOPAUSE", "-dQUIET", "-sDEVICE=pdfwrite"}

// compressionPresets maps user levels to Ghostscript PDFSETTINGS.
var compressionPresets = map[string]string{
	"low":         "/printer",
	"recommended": "/ebook",
	"strong":      "/screen",
}

// Compress shrinks PDFs with Ghostscript, keeping the original when it is already smaller.
type Compress struct{ Runner runner.Runner }

func (t Compress) Process(ctx context.Context, in Input) ([]Output, error) {
	level := in.Options["level"]
	if level == "" {
		level = "recommended"
	}
	preset, ok := compressionPresets[level]
	if !ok {
		return nil, newError(CodeInvalidOption, fmt.Errorf("unknown level %q", level))
	}

	var outputs []Output
	for i, f := range in.Files {
		if err := ensureOpenable(ctx, t.Runner, in.Dir, f.Path); err != nil {
			return nil, err
		}
		out := outputPath(in.Dir, i, "pdf")
		args := append(append([]string{}, gsBaseArgs...),
			"-dCompatibilityLevel=1.7",
			"-dPDFSETTINGS="+preset,
			"-dDetectDuplicateImages=true",
			"-dCompressFonts=true",
			"-sOutputFile="+out,
			f.Path,
		)
		if _, err := t.Runner.Run(ctx, runner.Command{Name: "gs", Args: args, Dir: in.Dir}); err != nil {
			return nil, newError(CodeConversionFailed, err)
		}
		if err := keepSmaller(f.Path, out); err != nil {
			return nil, err
		}
		outputs = append(outputs, Output{Path: out, Name: outputName(f.Name, "pdf"), ContentType: mimePDF})
	}
	return outputs, nil
}

// keepSmaller replaces out with a copy of original when compression made the file larger.
func keepSmaller(original, out string) error {
	a, err := os.Stat(original)
	if err != nil {
		return err
	}
	b, err := os.Stat(out)
	if err != nil {
		return err
	}
	if b.Size() < a.Size() {
		return nil
	}
	return copyFile(original, out)
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		out.Close()
		return err
	}
	return out.Close()
}

// PDFA converts PDFs to PDF/A-2b with Ghostscript.
type PDFA struct {
	Runner runner.Runner
	// DefTemplate is Ghostscript's PDFA_def.ps; ICCProfile an sRGB profile (both from the gs package).
	DefTemplate string
	ICCProfile  string
}

var iccLine = regexp.MustCompile(`/ICCProfile\s*\([^)]*\)`)

func (t PDFA) Process(ctx context.Context, in Input) ([]Output, error) {
	version := in.Options["version"]
	if version == "" {
		version = "2"
	}
	if version != "1" && version != "2" && version != "3" {
		return nil, newError(CodeInvalidOption, fmt.Errorf("unknown PDF/A version %q", version))
	}
	def, err := t.writeDef(in.Dir)
	if err != nil {
		return nil, err
	}

	var outputs []Output
	for i, f := range in.Files {
		if err := ensureOpenable(ctx, t.Runner, in.Dir, f.Path); err != nil {
			return nil, err
		}
		out := outputPath(in.Dir, i, "pdf")
		args := append(append([]string{}, gsBaseArgs...),
			"-dPDFA="+version,
			"-dPDFACompatibilityPolicy=1",
			"-sColorConversionStrategy=RGB",
			"--permit-file-read="+t.ICCProfile,
			"-sOutputFile="+out,
			def,
			f.Path,
		)
		if _, err := t.Runner.Run(ctx, runner.Command{Name: "gs", Args: args, Dir: in.Dir}); err != nil {
			return nil, newError(CodeConversionFailed, err)
		}
		outputs = append(outputs, Output{Path: out, Name: outputName(f.Name, "pdf"), ContentType: mimePDF})
	}
	return outputs, nil
}

// writeDef copies Ghostscript's PDFA_def.ps into the job, pointing it at the configured ICC profile.
func (t PDFA) writeDef(dir string) (string, error) {
	tpl, err := os.ReadFile(t.DefTemplate)
	if err != nil {
		return "", fmt.Errorf("read PDFA_def.ps: %w", err)
	}
	if !iccLine.Match(tpl) {
		return "", errors.New("PDFA_def.ps: ICCProfile line not found")
	}
	def := iccLine.ReplaceAll(tpl, []byte("/ICCProfile ("+t.ICCProfile+")"))
	path := filepath.Join(dir, "PDFA_def.ps")
	return path, os.WriteFile(path, def, 0o600)
}

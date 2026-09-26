package tools

import (
	"time"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
)

// Concurrency pools, one per external program.
const (
	PoolGhostscript = "ghostscript"
	PoolQpdf        = "qpdf"
	PoolOffice      = "office"
	PoolOCR         = "ocr"
)

// Deps are the collaborators the tools need.
type Deps struct {
	Runner runner.Runner
	// Ghostscript's PDFA_def.ps and an sRGB ICC profile.
	PDFADef    string
	ICCProfile string
	// Internal OCR service.
	OCRClient HTTPDoer
	OCRURL    string
}

// Specs returns every server tool. IDs match the web app's tool registry.
func Specs(d Deps) []Spec {
	r := d.Runner
	pdf := []string{".pdf"}
	return []Spec{
		{ID: "compress", Extensions: pdf, MaxFiles: 20, Timeout: 5 * time.Minute, Pool: PoolGhostscript, Tool: Compress{Runner: r}},
		{ID: "pdf-to-pdfa", Extensions: pdf, MaxFiles: 1, Timeout: 5 * time.Minute, Pool: PoolGhostscript,
			Tool: PDFA{Runner: r, DefTemplate: d.PDFADef, ICCProfile: d.ICCProfile}},
		{ID: "repair", Extensions: pdf, MaxFiles: 20, Timeout: 2 * time.Minute, Pool: PoolQpdf, Tool: Repair{Runner: r}},
		{ID: "protect", Extensions: pdf, MaxFiles: 1, Timeout: time.Minute, Pool: PoolQpdf, Tool: Protect{Runner: r}},
		{ID: "unlock", Extensions: pdf, MaxFiles: 1, Timeout: time.Minute, Pool: PoolQpdf, Tool: Unlock{Runner: r}},
		{ID: "word-to-pdf", Extensions: []string{".doc", ".docx", ".odt", ".rtf", ".txt"}, MaxFiles: 20,
			Timeout: 3 * time.Minute, Pool: PoolOffice, Tool: Office{Runner: r, Target: "pdf"}},
		{ID: "excel-to-pdf", Extensions: []string{".xls", ".xlsx", ".ods", ".csv"}, MaxFiles: 20,
			Timeout: 3 * time.Minute, Pool: PoolOffice, Tool: Office{Runner: r, Target: "pdf"}},
		{ID: "powerpoint-to-pdf", Extensions: []string{".ppt", ".pptx", ".odp"}, MaxFiles: 20,
			Timeout: 3 * time.Minute, Pool: PoolOffice, Tool: Office{Runner: r, Target: "pdf"}},
		{ID: "pdf-to-word", Extensions: pdf, MaxFiles: 1, Timeout: 3 * time.Minute, Pool: PoolOffice,
			Tool: Office{Runner: r, Target: "docx", ImportFilter: "writer_pdf_import"}},
		{ID: "ocr", Extensions: []string{".pdf", ".jpg", ".jpeg", ".png", ".tif", ".tiff"}, MaxFiles: 1,
			Timeout: 15 * time.Minute, Pool: PoolOCR, Tool: OCR{Client: d.OCRClient, BaseURL: d.OCRURL}},
	}
}

// Package config reads gateway settings from the environment.
package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

type Config struct {
	Addr          string
	WorkDir       string
	MaxUploadMB   int64
	JobTTL        time.Duration
	OCRServiceURL string

	MaxPendingJobs     int
	GhostscriptWorkers int
	QpdfWorkers        int
	OfficeWorkers      int

	RateLimitPerMinute int
	RateLimitBurst     int
	// TrustedProxyHops is how many proxies in front of the gateway append to X-Forwarded-For
	// (reverse proxy → 1, reverse proxy → Next.js → 2). 0 ignores the header.
	TrustedProxyHops int

	// Ghostscript's PDFA_def.ps and an sRGB ICC profile, used for PDF/A conversion.
	PDFADef    string
	ICCProfile string
}

func Load() (Config, error) {
	c := Config{
		Addr:          env("GATEWAY_ADDR", ":8080"),
		WorkDir:       env("GATEWAY_WORK_DIR", filepath.Join(os.TempDir(), "pdfduzenle")),
		OCRServiceURL: env("OCR_SERVICE_URL", "http://ocr:8000"),
		PDFADef:       env("GATEWAY_PDFA_DEF", firstMatch("/usr/share/ghostscript/*/lib/PDFA_def.ps")),
		ICCProfile:    env("GATEWAY_ICC_PROFILE", "/usr/share/color/icc/ghostscript/srgb.icc"),
	}
	ints := []struct {
		key      string
		fallback string
		dst      *int
	}{
		{"GATEWAY_MAX_PENDING_JOBS", "50", &c.MaxPendingJobs},
		{"GATEWAY_GS_WORKERS", "2", &c.GhostscriptWorkers},
		{"GATEWAY_QPDF_WORKERS", "4", &c.QpdfWorkers},
		{"GATEWAY_OFFICE_WORKERS", "2", &c.OfficeWorkers},
		{"GATEWAY_RATE_PER_MINUTE", "20", &c.RateLimitPerMinute},
		{"GATEWAY_RATE_BURST", "10", &c.RateLimitBurst},
		{"GATEWAY_TRUSTED_PROXY_HOPS", "1", &c.TrustedProxyHops},
	}
	for _, i := range ints {
		v, err := strconv.Atoi(env(i.key, i.fallback))
		if err != nil || v < 0 || (v == 0 && i.key != "GATEWAY_TRUSTED_PROXY_HOPS") {
			return c, fmt.Errorf("%s: must be a positive integer", i.key)
		}
		*i.dst = v
	}
	var err error
	if c.MaxUploadMB, err = strconv.ParseInt(env("GATEWAY_MAX_UPLOAD_MB", "100"), 10, 64); err != nil || c.MaxUploadMB < 1 {
		return c, fmt.Errorf("GATEWAY_MAX_UPLOAD_MB: must be a positive integer")
	}
	if c.JobTTL, err = time.ParseDuration(env("GATEWAY_JOB_TTL", "1h")); err != nil {
		return c, fmt.Errorf("GATEWAY_JOB_TTL: %w", err)
	}
	return c, nil
}

func env(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func firstMatch(pattern string) string {
	matches, _ := filepath.Glob(pattern)
	if len(matches) == 0 {
		return ""
	}
	return matches[len(matches)-1]
}

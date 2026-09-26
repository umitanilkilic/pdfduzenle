// Package config reads gateway settings from the environment.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Addr          string
	WorkDir       string
	MaxUploadMB   int64
	JobTTL        time.Duration
	OCRServiceURL string
}

func Load() (Config, error) {
	c := Config{
		Addr:          env("GATEWAY_ADDR", ":8080"),
		WorkDir:       env("GATEWAY_WORK_DIR", os.TempDir()+"/pdfduzenle"),
		OCRServiceURL: env("OCR_SERVICE_URL", "http://ocr:8000"),
	}
	var err error
	if c.MaxUploadMB, err = strconv.ParseInt(env("GATEWAY_MAX_UPLOAD_MB", "100"), 10, 64); err != nil {
		return c, fmt.Errorf("GATEWAY_MAX_UPLOAD_MB: %w", err)
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

package config

import (
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	for _, k := range []string{"GATEWAY_ADDR", "GATEWAY_MAX_UPLOAD_MB", "GATEWAY_JOB_TTL", "OCR_SERVICE_URL"} {
		t.Setenv(k, "")
	}
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.Addr != ":8080" || c.MaxUploadMB != 100 || c.JobTTL != time.Hour || c.OCRServiceURL != "http://ocr:8000" {
		t.Fatalf("unexpected defaults: %+v", c)
	}
}

func TestLoadOverrides(t *testing.T) {
	t.Setenv("GATEWAY_MAX_UPLOAD_MB", "25")
	t.Setenv("GATEWAY_JOB_TTL", "15m")
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.MaxUploadMB != 25 || c.JobTTL != 15*time.Minute {
		t.Fatalf("overrides not applied: %+v", c)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	cases := map[string]string{"GATEWAY_MAX_UPLOAD_MB": "lots", "GATEWAY_JOB_TTL": "forever"}
	for key, value := range cases {
		t.Run(key, func(t *testing.T) {
			t.Setenv(key, value)
			if _, err := Load(); err == nil {
				t.Fatalf("expected error for %s=%s", key, value)
			}
		})
	}
}

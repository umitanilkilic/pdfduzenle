// Command gateway is the public HTTP API of pdfduzenle.tr.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/config"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/httpapi"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/jobs"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/ratelimit"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/runner"
	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/tools"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("gateway stopped", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if cfg.PDFADef == "" {
		log.Warn("PDFA_def.ps not found; PDF/A conversion will fail")
	}

	manager, err := jobs.New(jobs.Options{
		WorkDir: cfg.WorkDir,
		TTL:     cfg.JobTTL,
		PoolSizes: map[string]int{
			tools.PoolGhostscript: cfg.GhostscriptWorkers,
			tools.PoolQpdf:        cfg.QpdfWorkers,
			tools.PoolOffice:      cfg.OfficeWorkers,
		},
		MaxPending: cfg.MaxPendingJobs,
		Log:        log,
	})
	if err != nil {
		return err
	}
	defer manager.Close()

	api := httpapi.New(
		httpapi.Options{MaxUploadBytes: cfg.MaxUploadMB << 20, TrustedProxyHops: cfg.TrustedProxyHops},
		log,
		tools.Specs(runner.Exec{}, cfg.PDFADef, cfg.ICCProfile),
		manager,
		ratelimit.New(cfg.RateLimitPerMinute, cfg.RateLimitBurst, nil),
	)
	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           api,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       2 * time.Minute,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go manager.RunSweeper(ctx, time.Minute)

	errc := make(chan error, 1)
	go func() {
		log.Info("gateway listening", "addr", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errc <- err
		}
	}()

	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

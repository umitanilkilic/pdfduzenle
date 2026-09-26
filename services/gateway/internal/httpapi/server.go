// Package httpapi exposes the public /api routes.
package httpapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/umitanilkilic/pdfduzenle/services/gateway/internal/config"
)

type Server struct {
	cfg config.Config
	log *slog.Logger
	mux *http.ServeMux
}

func New(cfg config.Config, log *slog.Logger) *Server {
	s := &Server{cfg: cfg, log: log, mux: http.NewServeMux()}
	s.mux.HandleFunc("GET /api/health", s.health)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

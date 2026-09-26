# syntax=docker/dockerfile:1
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/gateway

FROM debian:trixie-slim
# PDF tools (run as separate processes) and fonts so Office documents render with matching metrics.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ghostscript qpdf \
      libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui libreoffice-draw-nogui \
      fonts-dejavu fonts-liberation2 fonts-crosextra-carlito fonts-crosextra-caladea fonts-noto-core \
 && rm -rf /var/lib/apt/lists/*
RUN useradd --system --create-home app
COPY --from=build /out/gateway /usr/local/bin/gateway
USER app
ENV GATEWAY_ADDR=:8080 GATEWAY_WORK_DIR=/tmp/pdfduzenle
EXPOSE 8080
CMD ["gateway"]

# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
FROM golang:1.27-alpine@sha256:8a5910f31396cd4d89662f56c68b3ae31d374308270a1c3bd96672ee5ed43414 AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/gateway

FROM debian:trixie-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f
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

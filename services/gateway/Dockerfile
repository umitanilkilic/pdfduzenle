# syntax=docker/dockerfile:1
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/gateway

# Debian base: the PDF tools (Ghostscript, qpdf, LibreOffice) are added here as the tools are implemented.
FROM debian:trixie-slim
RUN useradd --system --create-home app
COPY --from=build /out/gateway /usr/local/bin/gateway
USER app
ENV GATEWAY_ADDR=:8080
EXPOSE 8080
CMD ["gateway"]

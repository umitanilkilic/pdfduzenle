#!/usr/bin/env bash
# Tests deploy/check-pins.sh on throwaway repositories.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/check-pins.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "${WORK:?}"' EXIT
SHA=3d3c42e5aac5ba805825da76410c181273ba90b1
DIGEST=sha256:$(printf 'a%.0s' {1..64})
failures=0

repo() { # $1 workflow step, $2 Dockerfile body, $3 deploy script line (optional)
  local dir="$WORK/$RANDOM$RANDOM"
  mkdir -p "$dir/.github/workflows" "$dir/web" "$dir/services/x"
  printf 'jobs:\n  a:\n    steps:\n      %s\n' "$1" >"$dir/.github/workflows/ci.yml"
  printf '%s\n' "$2" >"$dir/web/Dockerfile"
  printf 'FROM scratch@%s\n' "$DIGEST" >"$dir/services/x/Dockerfile"
  mkdir -p "$dir/deploy"
  printf '%s\n' "${3:-TOOL_IMAGE=example.org/tool:v1@$DIGEST}" >"$dir/deploy/run.sh"
  echo "$dir"
}

expect() { # $1 pass|fail, $2 name, $3 repo
  if bash "$SCRIPT" "$3" >/dev/null; then got=pass; else got=fail; fi
  if [[ "$got" == "$1" ]]; then echo "ok   $2"; else
    echo "FAIL $2 (expected $1)"
    failures=$((failures + 1))
  fi
}

PINNED="# syntax=docker/dockerfile:1@$DIGEST
FROM node:24@$DIGEST AS build
COPY --from=build /a /b
FROM debian@$DIGEST"

expect pass "pinned actions, local actions and pinned images" \
  "$(repo "- uses: actions/checkout@$SHA # v7" "$PINNED")"
expect pass "local actions need no pin" "$(repo "- uses: ./.github/actions/x" "$PINNED")"
expect fail "action by tag" "$(repo "- uses: actions/checkout@v7" "$PINNED")"
expect fail "action by branch" "$(repo "- uses: actions/checkout@main" "$PINNED")"
expect fail "action by short SHA" "$(repo "- uses: actions/checkout@3d3c42e" "$PINNED")"
expect fail "base image by tag" "$(repo "- uses: actions/checkout@$SHA" "FROM node:24-alpine AS build")"
expect fail "COPY --from an image by tag" \
  "$(repo "- uses: actions/checkout@$SHA" "FROM node@$DIGEST
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uv")"
expect fail "unpinned syntax frontend" "$(repo "- uses: actions/checkout@$SHA" "# syntax=docker/dockerfile:1
FROM node@$DIGEST")"

expect fail "tool image in a deploy script by tag" \
  "$(repo "- uses: actions/checkout@$SHA" "$PINNED" "TOOL_IMAGE=ghcr.io/sigstore/cosign/cosign:v3")"

[[ $failures -eq 0 ]] || exit 1
echo "all passed"

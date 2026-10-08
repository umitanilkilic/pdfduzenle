#!/usr/bin/env bash
# Deploys pdfduzenle.tr from attested images only. Install as the forced command of the CI deploy key:
#   command="/opt/pdfduzenle/deploy/server-deploy.sh",restrict ssh-ed25519 AAAA... github-actions
# CI then runs: ssh root@host deploy <commit> <web-digest> <gateway-digest> <ocr-digest>
# By hand:      deploy/server-deploy.sh rollback
#
# For every image it checks with cosign that the digest carries a SLSA provenance and an SBOM attestation
# signed by this repository's release workflow on main, from exactly the given commit. Only then does it
# check out that commit's compose files and start the containers by digest. Nothing is ever built here.
# cosign runs from its official image (pinned by digest), so the server needs only Docker: no extra tools,
# no tokens. It must reach ghcr.io and Sigstore's trust root (tuf-repo-cdn.sigstore.dev).
set -euo pipefail

REPO="${PDFDUZENLE_REPO:-umitanilkilic/pdfduzenle}"
REGISTRY="${PDFDUZENLE_REGISTRY:-ghcr.io/umitanilkilic}"
DIR="${PDFDUZENLE_DIR:-/opt/pdfduzenle}"
# The identity GitHub's OIDC token gives the release workflow when it runs on main.
SIGNER="https://github.com/$REPO/.github/workflows/release.yml@refs/heads/main"
ISSUER=https://token.actions.githubusercontent.com
COSIGN_IMAGE=ghcr.io/sigstore/cosign/cosign:v3.1.3@sha256:9e5c2f2edc34351160407ca3416c61855bdf9403c3c5936e0f0be7fc261611b8
SERVICES=(web gateway ocr)
PREDICATES=(https://slsa.dev/provenance/v1 https://spdx.dev/Document/v2.3)

log() { printf '[deploy] %s\n' "$*" >&2; }
die() {
  log "error: $*"
  exit 1
}

compose() {
  docker compose --project-directory "$DIR" -f "$DIR/compose.yaml" -f "$DIR/compose.release.yaml" \
    --env-file "$DIR/.env" --env-file "$DIR/.images.env" "$@"
}

verify_image() {
  local ref="$1" commit="$2" predicate
  for predicate in "${PREDICATES[@]}"; do
    docker run --rm "$COSIGN_IMAGE" verify-attestation --type "$predicate" \
      --certificate-identity "$SIGNER" --certificate-oidc-issuer "$ISSUER" \
      --certificate-github-workflow-repository "$REPO" --certificate-github-workflow-ref refs/heads/main \
      --certificate-github-workflow-sha "$commit" "$ref" >/dev/null ||
      die "attestation $predicate does not verify for $ref"
  done
  log "verified $ref"
}

# Puts the given commit's compose files in place and starts the images listed in .images.env.
start() {
  local commit="$1"
  git -C "$DIR" fetch --quiet origin main
  git -C "$DIR" merge-base --is-ancestor "$commit" origin/main || die "$commit is not on main"
  git -C "$DIR" checkout --quiet --detach "$commit"
  compose pull --quiet
  compose up -d --no-build --remove-orphans
  log "running $commit"
}

deploy() {
  [[ $# -eq 4 ]] || die "usage: deploy <commit> <web-digest> <gateway-digest> <ocr-digest>"
  local commit="$1" digests=("$2" "$3" "$4") i ref
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || die "invalid commit: $commit"
  local env="DEPLOYED_COMMIT=$commit"$'\n'
  for i in "${!SERVICES[@]}"; do
    [[ "${digests[$i]}" =~ ^sha256:[0-9a-f]{64}$ ]] || die "invalid digest for ${SERVICES[$i]}: ${digests[$i]}"
    ref="$REGISTRY/pdfduzenle-${SERVICES[$i]}@${digests[$i]}"
    verify_image "$ref" "$commit"
    env+="$(tr '[:lower:]' '[:upper:]' <<<"${SERVICES[$i]}")_IMAGE=$ref"$'\n'
  done
  if [[ -f "$DIR/.images.env" ]]; then cp "$DIR/.images.env" "$DIR/.images.env.previous"; fi
  printf '%s' "$env" >"$DIR/.images.env.next"
  mv "$DIR/.images.env.next" "$DIR/.images.env"
  start "$commit"
}

rollback() {
  [[ -f "$DIR/.images.env.previous" ]] || die "no previous deployment to roll back to"
  local commit
  commit="$(sed -n 's/^DEPLOYED_COMMIT=//p' "$DIR/.images.env.previous")"
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || die "previous deployment has no valid commit"
  mv "$DIR/.images.env" "$DIR/.images.env.failed"
  cp "$DIR/.images.env.previous" "$DIR/.images.env"
  start "$commit"
}

main() {
  # Through the forced command the arguments arrive in SSH_ORIGINAL_COMMAND; they are only ever compared
  # against strict patterns above, never evaluated.
  local args=()
  if [[ -n "${SSH_ORIGINAL_COMMAND:-}" ]]; then
    read -r -a args <<<"$SSH_ORIGINAL_COMMAND"
  else
    args=("$@")
  fi
  [[ ${#args[@]} -gt 0 ]] || die "usage: deploy <commit> <digests...> | rollback"
  case "${args[0]}" in
    deploy) deploy "${args[@]:1}" ;;
    rollback) rollback ;;
    *) die "unknown command: ${args[0]}" ;;
  esac
}

# On one line: bash has read it completely before `git checkout` may replace this file.
main "$@"; exit

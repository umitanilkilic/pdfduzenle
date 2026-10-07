#!/usr/bin/env bash
# Deploys pdfduzenle.tr from attested images only. Install as the forced command of the CI deploy key:
#   command="/opt/pdfduzenle/deploy/server-deploy.sh",restrict ssh-ed25519 AAAA... github-actions
# CI then runs: ssh root@host deploy <commit> <web-digest> <gateway-digest> <ocr-digest>
# By hand:      deploy/server-deploy.sh rollback
#
# For every image it checks, with `gh attestation verify`, that the digest was built by this repository's
# release workflow from the given commit on main (SLSA provenance) and has a signed SBOM. Only then does it
# check out that commit's compose files and start the containers by digest. Nothing is ever built here.
set -euo pipefail

REPO="${PDFDUZENLE_REPO:-umitanilkilic/pdfduzenle}"
REGISTRY="${PDFDUZENLE_REGISTRY:-ghcr.io/umitanilkilic}"
DIR="${PDFDUZENLE_DIR:-/opt/pdfduzenle}"
WORKFLOW="$REPO/.github/workflows/release.yml"
SERVICES=(web gateway ocr)
PREDICATES=(https://slsa.dev/provenance/v1 https://spdx.dev/Document/v2.3)

# gh needs a token to fetch Sigstore's trust root; a fine-grained token without permissions is enough.
TOKEN_FILE="${PDFDUZENLE_GH_TOKEN_FILE:-/etc/pdfduzenle/gh-token}"
if [[ -z "${GH_TOKEN:-}" && -r "$TOKEN_FILE" ]]; then
  GH_TOKEN="$(<"$TOKEN_FILE")"
  export GH_TOKEN
fi

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
    gh attestation verify "oci://$ref" --repo "$REPO" --bundle-from-oci \
      --signer-workflow "$WORKFLOW" --source-ref refs/heads/main --source-digest "$commit" \
      --predicate-type "$predicate" --deny-self-hosted-runners >/dev/null ||
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

#!/usr/bin/env bash
# Tests deploy/server-deploy.sh with fake gh, git and docker commands on PATH.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/server-deploy.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
COMMIT=0123456789abcdef0123456789abcdef01234567
OLD=89abcdef0123456789abcdef0123456789abcdef
D1=sha256:$(printf 'a%.0s' {1..64})
D2=sha256:$(printf 'b%.0s' {1..64})
D3=sha256:$(printf 'c%.0s' {1..64})
failures=0

setup() {
  rm -rf "${WORK:?}/dir" "${WORK:?}/bin" "${WORK:?}/calls"
  mkdir -p "$WORK/dir" "$WORK/bin"
  touch "$WORK/dir/.env" "$WORK/calls"
  for cmd in gh git docker; do
    cat >"$WORK/bin/$cmd" <<STUB
#!/usr/bin/env bash
echo "$cmd \$*" >>"$WORK/calls"
if [[ "$cmd" == gh && -n "\${FAIL_VERIFY:-}" && "\$*" == *"\$FAIL_VERIFY"* ]]; then exit 1; fi
if [[ "$cmd" == git && "\$*" == *merge-base* && -n "\${NOT_ON_MAIN:-}" ]]; then exit 1; fi
exit 0
STUB
    chmod +x "$WORK/bin/$cmd"
  done
}

run() {
  PATH="$WORK/bin:$PATH" PDFDUZENLE_DIR="$WORK/dir" PDFDUZENLE_GH_TOKEN_FILE=/nonexistent GH_TOKEN=test \
    "$SCRIPT" "$@" >"$WORK/out" 2>&1
}

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "ok   $name"
  else
    echo "FAIL $name"
    sed 's/^/     /' "$WORK/out" "$WORK/calls"
    failures=$((failures + 1))
  fi
}

calls_before() { # $1 happens before $2 in the call log
  local a b
  a=$(grep -n -m1 -- "$1" "$WORK/calls" | cut -d: -f1)
  b=$(grep -n -m1 -- "$2" "$WORK/calls" | cut -d: -f1)
  [[ -n "$a" && -n "$b" && "$a" -lt "$b" ]]
}

# A valid deployment verifies all six attestations, then checks out the commit and starts by digest.
setup
check "deploys valid digests" run deploy "$COMMIT" "$D1" "$D2" "$D3"
check "verifies provenance and SBOM for each image" test "$(grep -c '^gh attestation verify' "$WORK/calls")" -eq 6
check "pins the signer workflow, branch and commit" \
  grep -q -- "--signer-workflow umitanilkilic/pdfduzenle/.github/workflows/release.yml --source-ref refs/heads/main --source-digest $COMMIT" "$WORK/calls"
check "verifies before starting anything" calls_before "gh attestation" "docker compose"
check "never builds" bash -c "! grep -q -- '--build ' '$WORK/calls' && grep -q -- 'up -d --no-build' '$WORK/calls'"
check "writes images by digest" grep -qx "WEB_IMAGE=ghcr.io/umitanilkilic/pdfduzenle-web@$D1" "$WORK/dir/.images.env"
check "records the commit" grep -qx "DEPLOYED_COMMIT=$COMMIT" "$WORK/dir/.images.env"
check "checks out the commit" grep -q "checkout --quiet --detach $COMMIT" "$WORK/calls"

# Same, through the SSH forced command.
setup
check "accepts arguments from SSH_ORIGINAL_COMMAND" \
  env SSH_ORIGINAL_COMMAND="deploy $COMMIT $D1 $D2 $D3" bash -c "$(declare -f run); WORK='$WORK' SCRIPT='$SCRIPT' run"

# Refusals: nothing is started and the running deployment is left alone.
for bad in "deploy main $D1 $D2 $D3" "deploy $COMMIT $D1 $D2" "deploy $COMMIT latest $D2 $D3" \
  "deploy $COMMIT $D1 $D2 $D3;reboot" "deploy $COMMIT \$(id) $D2 $D3" "shell" ""; do
  setup
  printf 'WEB_IMAGE=running\n' >"$WORK/dir/.images.env"
  # shellcheck disable=SC2086 # split on purpose, like the forced command does
  check "rejects: ${bad:-<empty>}" bash -c "! (SSH_ORIGINAL_COMMAND='$bad'; export SSH_ORIGINAL_COMMAND; $(declare -f run); WORK='$WORK' SCRIPT='$SCRIPT' run)"
  check "  …and starts nothing" bash -c "! grep -q 'docker' '$WORK/calls' && grep -qx 'WEB_IMAGE=running' '$WORK/dir/.images.env'"
done

setup
printf 'WEB_IMAGE=running\n' >"$WORK/dir/.images.env"
check "refuses an image whose attestation fails" bash -c "! (FAIL_VERIFY=pdfduzenle-gateway; export FAIL_VERIFY; $(declare -f run); WORK='$WORK' SCRIPT='$SCRIPT' run deploy $COMMIT $D1 $D2 $D3)"
check "  …and starts nothing" bash -c "! grep -q 'docker' '$WORK/calls' && grep -qx 'WEB_IMAGE=running' '$WORK/dir/.images.env'"

setup
check "refuses a commit that is not on main" bash -c "! (NOT_ON_MAIN=1; export NOT_ON_MAIN; $(declare -f run); WORK='$WORK' SCRIPT='$SCRIPT' run deploy $COMMIT $D1 $D2 $D3)"
check "  …and starts nothing" bash -c "! grep -q 'docker' '$WORK/calls'"

# Rollback returns to the previous digests and commit.
setup
printf 'DEPLOYED_COMMIT=%s\nWEB_IMAGE=old\n' "$OLD" >"$WORK/dir/.images.env"
run deploy "$COMMIT" "$D1" "$D2" "$D3"
: >"$WORK/calls"
check "rolls back" run rollback
check "  …to the previous images" grep -qx "WEB_IMAGE=old" "$WORK/dir/.images.env"
check "  …and commit" grep -q "checkout --quiet --detach $OLD" "$WORK/calls"
setup
check "refuses a rollback without a previous deployment" bash -c "! ($(declare -f run); WORK='$WORK' SCRIPT='$SCRIPT' run rollback)"

[[ $failures -eq 0 ]] || {
  echo "$failures failed"
  exit 1
}
echo "all passed"

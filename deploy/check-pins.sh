#!/usr/bin/env bash
# Fails when a workflow uses an action by tag/branch, or a Dockerfile pulls an image without a digest.
# Tags can be moved to other code; commit SHAs and image digests cannot. Usage: check-pins.sh [repo-root]
set -euo pipefail
cd "${1:-$(dirname "$0")/..}"
bad=0

while IFS= read -r line; do
  echo "unpinned action: $line"
  bad=1
done < <(grep -rnE '^\s*(- )?uses:\s' .github/workflows | grep -vE 'uses:\s+\./' | grep -vE '@[0-9a-f]{40}(\s|$)' || true)

for file in web/Dockerfile services/*/Dockerfile; do
  # Build stages declared in this file may be referenced without a digest.
  mapfile -t stages < <(sed -nE 's/^FROM .* AS ([A-Za-z0-9_-]+).*/\1/p' "$file")
  while IFS= read -r line; do
    ref=$(sed -nE 's/^(# syntax=|FROM |COPY --from=)([^ ]+).*/\2/p' <<<"$line")
    [[ -z "$ref" || "$ref" == *@sha256:* ]] && continue
    printf '%s\n' "${stages[@]}" | grep -qxF "$ref" && continue
    echo "unpinned image in $file: $line"
    bad=1
  done < <(grep -E '^(# syntax=|FROM |COPY --from=)' "$file")
done

exit "$bad"

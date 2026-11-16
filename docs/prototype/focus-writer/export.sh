#!/usr/bin/env bash
# Docx and PDF go through dialect/export.sh.
if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "This script requires bash." >&2
  exit 1
fi
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
dialect="$here/../../dialect/export.sh"

format="docx"
input=""
output=""
rig=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --format)
      format="${2:-}"
      shift 2
      ;;
    --input)
      input="${2:-}"
      shift 2
      ;;
    --out)
      output="${2:-}"
      shift 2
      ;;
    --rig)
      rig="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$input" ]]; then
  for candidate in "$here/manuscript.md" "$here/out/manuscript.md" "$PWD/manuscript.md"; do
    if [[ -f "$candidate" ]]; then
      input="$candidate"
      break
    fi
  done
fi
if [[ -z "$input" || ! -f "$input" ]]; then
  echo "No manuscript.md found. Export Markdown from the writer first." >&2
  exit 1
fi

if [[ -z "$output" ]]; then
  mkdir -p "$here/out"
  base="$(basename "$input")"
  base="${base%.*}"
  output="$here/out/$base.$format"
fi

args=(--input "$input" --format "$format" --out "$output")
if [[ -n "$rig" ]]; then
  args+=(--rig "$rig")
fi
bash "$dialect" "${args[@]}"

case "$(uname -s)" in
  Darwin)
    open -R "$output" >/dev/null 2>&1 || true
    ;;
  MINGW* | MSYS* | CYGWIN*)
    if command -v cygpath >/dev/null 2>&1; then
      explorer.exe /select,"$(cygpath -w "$output")" || true
    fi
    ;;
esac

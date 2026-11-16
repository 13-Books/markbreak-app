#!/usr/bin/env bash
# Open the focus prototype as an app window when Chrome or Edge is installed.
if [[ -z "${BASH_VERSION:-}" ]]; then
  echo "This script requires bash." >&2
  exit 1
fi
set -euo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
html="$here/index.html"

case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*)
    win="$(cygpath -m "$html")"
    uri="file:///${win// /%20}"
    ;;
  *)
    uri="file://${html}"
    ;;
esac

open_default() {
  case "$(uname -s)" in
    Darwin)
      open "$html"
      ;;
    MINGW* | MSYS* | CYGWIN*)
      explorer.exe "$(cygpath -w "$html")"
      ;;
    *)
      xdg-open "$html"
      ;;
  esac
  echo "Opened in default browser (no Chrome/Edge app mode found)."
}

launch_app() {
  "$1" --app="$uri" --new-window >/dev/null 2>&1 &
  echo "Focus prototype: $uri"
}

case "$(uname -s)" in
  Darwin)
    if open -na "Google Chrome" --args "--app=$uri" --new-window >/dev/null 2>&1; then
      echo "Focus prototype: $uri"
      exit 0
    fi
    if open -na "Microsoft Edge" --args "--app=$uri" --new-window >/dev/null 2>&1; then
      echo "Focus prototype: $uri"
      exit 0
    fi
    open_default
    ;;
  Linux)
    for browser in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge microsoft-edge-stable; do
      if command -v "$browser" >/dev/null 2>&1; then
        launch_app "$browser"
        exit 0
      fi
    done
    open_default
    ;;
  MINGW* | MSYS* | CYGWIN*)
    local_app="${LOCALAPPDATA:-}"
    candidates=(
      "/c/Program Files/Google/Chrome/Application/chrome.exe"
      "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
      "/c/Program Files/Microsoft/Edge/Application/msedge.exe"
    )
    if [[ -n "$local_app" ]]; then
      candidates+=("$local_app/Google/Chrome/Application/chrome.exe")
    fi
    for browser in "${candidates[@]}"; do
      if [[ -f "$browser" ]]; then
        launch_app "$browser"
        exit 0
      fi
    done
    open_default
    ;;
  *)
    open_default
    ;;
esac

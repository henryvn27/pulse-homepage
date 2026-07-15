#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Install Xcode from the Mac App Store, open it once, then run this installer again." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js 20 or newer from https://nodejs.org, then run this installer again." >&2
  exit 1
fi

npm install
./script/configure.sh
./script/build_and_run.sh --verify

echo
echo "Pulse is installed. Enable Pulse Extension in Safari → Settings → Extensions, then open a new tab."

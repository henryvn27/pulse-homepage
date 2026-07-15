#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAFE_USER="$(printf '%s' "${USER:-pulse}" | tr -cd '[:alnum:]' | tr '[:upper:]' '[:lower:]')"
PREFIX="${1:-dev.${SAFE_USER:-pulse}.pulse}"

if [[ ! "$PREFIX" =~ ^[A-Za-z][A-Za-z0-9.-]*$ ]]; then
  echo "usage: $0 [bundle-prefix]" >&2
  echo "example: $0 com.yourname" >&2
  exit 2
fi

IDENTITY="${PULSE_CODE_SIGN_IDENTITY:-$(security find-identity -v -p codesigning | sed -n 's/.*"\(Apple Development:[^"]*\)"/\1/p' | head -n 1)}"
if [[ -z "$IDENTITY" ]]; then
  echo "Pulse needs an Apple Development signing identity for the native Safari extension." >&2
  echo "Open Xcode → Settings → Accounts, sign in with an Apple ID, create a development certificate, then run this command again." >&2
  exit 1
fi

TEAM="${PULSE_DEVELOPMENT_TEAM:-$(security find-certificate -c "$IDENTITY" -p 2>/dev/null | openssl x509 -noout -subject -nameopt RFC2253 | sed -n 's/.*OU=\([^,]*\).*/\1/p')}"
if [[ -z "$TEAM" ]]; then
  echo "Could not determine the Apple development team from the signing identity." >&2
  echo "Run again with PULSE_DEVELOPMENT_TEAM=YOUR_TEAM_ID." >&2
  exit 1
fi

{
  printf 'PULSE_BUNDLE_PREFIX=%q\n' "$PREFIX"
  printf 'PULSE_DEVELOPMENT_TEAM=%q\n' "$TEAM"
} > "$ROOT_DIR/.pulse.env"

echo "Pulse is configured for local signing."
echo "  app:       $PREFIX.Pulse"
echo "  extension: $PREFIX.Pulse.Extension"
echo "Run ./script/build_and_run.sh --verify to build and install it."

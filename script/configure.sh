#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFIX="${1:-}"

if [[ ! "$PREFIX" =~ ^[A-Za-z][A-Za-z0-9.-]*$ ]]; then
  echo "usage: $0 <bundle-prefix>" >&2
  echo "example: $0 com.yourname" >&2
  exit 2
fi

HOST_ID="$PREFIX.Pulse"
EXTENSION_ID="$HOST_ID.Extension"
PROJECT="$ROOT_DIR/Pulse Safari Extension/Pulse/Pulse.xcodeproj/project.pbxproj"
DATA_SOURCE="$ROOT_DIR/src/pulseData.js"
HOST_SOURCE="$ROOT_DIR/Pulse Safari Extension/Pulse/Pulse/ViewController.swift"

perl -0pi -e "s/PRODUCT_BUNDLE_IDENTIFIER = [A-Za-z0-9.-]+\\.Pulse\\.Extension;/PRODUCT_BUNDLE_IDENTIFIER = $EXTENSION_ID;/g; s/PRODUCT_BUNDLE_IDENTIFIER = [A-Za-z0-9.-]+\\.Pulse;/PRODUCT_BUNDLE_IDENTIFIER = $HOST_ID;/g" "$PROJECT"
perl -0pi -e "s/const NATIVE_HOST = \"[A-Za-z0-9.-]+\\.Pulse\";/const NATIVE_HOST = \"$HOST_ID\";/" "$DATA_SOURCE"
perl -0pi -e "s/private let extensionBundleIdentifier = \"[A-Za-z0-9.-]+\\.Pulse\\.Extension\"/private let extensionBundleIdentifier = \"$EXTENSION_ID\"/" "$HOST_SOURCE"

echo "Configured Pulse"
echo "  host:      $HOST_ID"
echo "  extension: $EXTENSION_ID"
echo "Next: select your development team for both targets in Xcode."

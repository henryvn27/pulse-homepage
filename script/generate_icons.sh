#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT_DIR/public/pulse-icon.svg"
APP_ICON_DIR="$ROOT_DIR/Pulse Safari Extension/Pulse/Pulse/Assets.xcassets/AppIcon.appiconset"
LARGE_ICON_DIR="$ROOT_DIR/Pulse Safari Extension/Pulse/Pulse/Assets.xcassets/LargeIcon.imageset"
APP_RESOURCES="$ROOT_DIR/Pulse Safari Extension/Pulse/Pulse/Resources"
EXTENSION_ICONS="$ROOT_DIR/extension/icons"
MASTER="$APP_ICON_DIR/icon_512x512@2x.png"

mkdir -p "$APP_ICON_DIR" "$LARGE_ICON_DIR" "$APP_RESOURCES" "$EXTENSION_ICONS"
/usr/bin/sips -s format png "$SOURCE" --out "$MASTER" >/dev/null

render() {
  local size="$1"
  local output="$2"
  /usr/bin/sips -z "$size" "$size" "$MASTER" --out "$output" >/dev/null
}

render 16 "$APP_ICON_DIR/icon_16x16.png"
render 32 "$APP_ICON_DIR/icon_16x16@2x.png"
render 32 "$APP_ICON_DIR/icon_32x32.png"
render 64 "$APP_ICON_DIR/icon_32x32@2x.png"
render 128 "$APP_ICON_DIR/icon_128x128.png"
render 256 "$APP_ICON_DIR/icon_128x128@2x.png"
render 256 "$APP_ICON_DIR/icon_256x256.png"
render 512 "$APP_ICON_DIR/icon_256x256@2x.png"
render 512 "$APP_ICON_DIR/icon_512x512.png"

render 128 "$LARGE_ICON_DIR/pulse-large.png"
render 256 "$LARGE_ICON_DIR/pulse-large@2x.png"
render 384 "$LARGE_ICON_DIR/pulse-large@3x.png"
render 384 "$APP_RESOURCES/Icon.png"

render 16 "$EXTENSION_ICONS/icon-16.png"
render 32 "$EXTENSION_ICONS/icon-32.png"
render 48 "$EXTENSION_ICONS/icon-48.png"
render 128 "$EXTENSION_ICONS/icon-128.png"

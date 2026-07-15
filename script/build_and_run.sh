#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-run}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/.pulse.env"
if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi
PROJECT="$ROOT_DIR/Pulse Safari Extension/Pulse/Pulse.xcodeproj"
DERIVED_DATA="$ROOT_DIR/build/DerivedData"
BUILT_APP="$DERIVED_DATA/Build/Products/Debug/Pulse.app"
APP_BUNDLE="${PULSE_APP_OUTPUT:-$ROOT_DIR/../Pulse.app}"
IDENTITY="${PULSE_CODE_SIGN_IDENTITY:-}"
TEAM="${PULSE_DEVELOPMENT_TEAM:-}"
BUNDLE_PREFIX="${PULSE_BUNDLE_PREFIX:-com.henry}"
LSREGISTER="/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister"

if [[ "$MODE" != "--build-only" && "$MODE" != "build-only" ]]; then
  pkill -x Pulse >/dev/null 2>&1 || true
fi

cd "$ROOT_DIR"
"$ROOT_DIR/script/generate_icons.sh"
export VITE_NATIVE_HOST="$BUNDLE_PREFIX.Pulse"
npm run build:single
EXTENSION_RESOURCES="Pulse Safari Extension/Pulse/Pulse Extension/Resources"
mkdir -p "$EXTENSION_RESOURCES/icons"
cp extension/index.html "$EXTENSION_RESOURCES/index.html"
cp extension/app.js "$EXTENSION_RESOURCES/app.js"
cp extension/app.css "$EXTENSION_RESOURCES/app.css"
cp extension/manifest.json "$EXTENSION_RESOURCES/manifest.json"
cp extension/icons/*.png "$EXTENSION_RESOURCES/icons/"

build_args=(
  -project "$PROJECT"
  -scheme Pulse
  -configuration Debug
  -derivedDataPath "$DERIVED_DATA"
  -destination "platform=macOS"
  CODE_SIGN_STYLE=Automatic
  PULSE_BUNDLE_PREFIX="$BUNDLE_PREFIX"
)

if [[ -n "$TEAM" ]]; then
  build_args+=(DEVELOPMENT_TEAM="$TEAM" -allowProvisioningUpdates)
fi

if [[ -n "$IDENTITY" ]]; then
  build_args+=(CODE_SIGN_IDENTITY="$IDENTITY")
fi

xcodebuild "${build_args[@]}" build

if [[ "$MODE" == "--build-only" || "$MODE" == "build-only" ]]; then
  echo "$BUILT_APP"
  exit 0
fi

rm -rf "$APP_BUNDLE"
/usr/bin/ditto "$BUILT_APP" "$APP_BUNDLE"
"$LSREGISTER" -u "$BUILT_APP" >/dev/null 2>&1 || true
"$LSREGISTER" -f -R -trusted "$APP_BUNDLE" >/dev/null

open_app() {
  /usr/bin/open -n "$APP_BUNDLE"
}

case "$MODE" in
  run)
    open_app
    ;;
  --debug|debug)
    lldb -- "$APP_BUNDLE/Contents/MacOS/Pulse"
    ;;
  --logs|logs)
    open_app
    /usr/bin/log stream --info --style compact --predicate 'process == "Pulse" OR process == "Pulse Extension"'
    ;;
  --telemetry|telemetry)
    open_app
    /usr/bin/log stream --info --style compact --predicate 'subsystem ENDSWITH ".Pulse"'
    ;;
  --verify|verify)
    open_app
    sleep 2
    pgrep -x Pulse >/dev/null
    ;;
  *)
    echo "usage: $0 [run|--debug|--logs|--telemetry|--verify|--build-only]" >&2
    exit 2
    ;;
esac

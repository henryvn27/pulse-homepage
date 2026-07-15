<p align="center">
  <img src="public/pulse-icon.svg" width="88" height="88" alt="Pulse icon" />
</p>

<h1 align="center">Pulse</h1>

<p align="center">
  A server-free Safari homepage for the work that matters now.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-20211f" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/macOS-12%2B-20211f?logo=apple&logoColor=white" alt="macOS 12 or later" />
  <img src="https://img.shields.io/badge/Safari-Web_Extension-20211f?logo=safari&logoColor=white" alt="Safari Web Extension" />
  <img src="https://img.shields.io/badge/no_server-required-257d72" alt="No server required" />
</p>

<p align="center">
  <img src="docs/pulse-dashboard.png" alt="Pulse showing a daily brief, reminders, calendar, Linear progress, weather, and shortcuts" width="1200" />
</p>

Pulse turns every new Safari tab into a concise daily brief. It combines your next commitment, Apple Reminders, Calendar, current Linear progress, weather, and editable shortcuts in one calm screen—without a localhost process, hosted backend, or background daemon.

## What you get

- **Daily Brief first.** The most useful summary is placed where you look first.
- **Apple-native actions.** See Calendar events, review Reminders, and mark reminders complete without leaving the page.
- **Linear without the backlog dump.** Pulse summarizes active work, recent throughput, and the issue that needs attention now.
- **Shortcuts that are actually yours.** Add, edit, remove, and reorder the links you use every day.
- **One-screen density.** The desktop dashboard is designed to fit a Safari viewport without vertical scrolling.
- **System-aware polish.** Light and dark modes follow Safari automatically, with source-shaped skeleton states while native data loads.
- **Local-first architecture.** The homepage is packaged inside a Safari Web Extension. Linear is called directly from the extension; Apple data stays behind the native EventKit bridge.

## Try it in 30 seconds

The standalone build gives you the complete visual shell, live weather, time, and customizable shortcuts. Calendar, Reminders, and Linear require the Safari extension described below.

```bash
git clone https://github.com/henryvn27/pulse-homepage.git
cd pulse-homepage
npm install
npm run build:single
open ../pulse-homepage.html
```

The generated `pulse-homepage.html` is self-contained and opens directly through a `file://` URL. No server is needed.

## Install the full Safari extension

You need macOS, Safari, Xcode, and an Apple development team for local code signing.

1. Install dependencies and build the web assets:

   ```bash
   npm install
   npm run build:single
   ```

2. Give the app a bundle prefix that belongs to your Apple developer account:

   ```bash
   ./script/configure.sh com.yourname
   ```

3. Open `Pulse Safari Extension/Pulse/Pulse.xcodeproj` in Xcode. Under **Signing & Capabilities**, select your team for both the **Pulse** and **Pulse Extension** targets.
4. Build and run the **Pulse** scheme.
5. In Safari → Settings → Extensions, enable **Pulse Extension**.
6. Open a new tab. Pulse is registered as Safari's new-tab page.
7. Open **Connections** in Pulse to authorize Calendar and Reminders and add a read-only Linear personal API key.

After signing is configured, the helper script can rebuild, install, launch, and verify the app:

```bash
PULSE_DEVELOPMENT_TEAM=YOUR_TEAM_ID ./script/build_and_run.sh --verify
```

## How it stays server-free

```text
Safari new tab
    ├── packaged React UI
    ├── Open-Meteo ─────────────── weather
    ├── Linear GraphQL ─────────── assigned-work summary
    └── Safari native messaging
            └── EventKit ───────── Calendar + Reminders
```

There is no application server. The standalone build inlines its JavaScript, CSS, fonts, and favicon into one HTML file. The extension build packages the same interface into the macOS host app.

## Configuration

| Setting | Where it lives |
| --- | --- |
| Display name and shortcuts | Safari extension local storage |
| Linear personal API key | Safari extension local storage |
| Calendar and Reminders access | macOS privacy permissions |
| Weather location | `src/pulseData.js` |
| Host and extension bundle IDs | `script/configure.sh` updates the project and source constants |

Never commit a Linear key. Pulse only needs a personal key with enough access to read your assigned issues; use the narrowest permissions available and rotate the key if it is ever exposed.

## Development

```bash
npm install
npm run dev          # local UI development
npm run build        # production web bundle
npm run build:single # self-contained HTML + Safari extension assets
```

The main surfaces are:

- `src/App.jsx` — dashboard interface and interactions
- `src/pulseData.js` — native bridge, Linear summary, and weather loading
- `src/styles.css` — responsive one-screen light/dark design
- `Pulse Safari Extension/` — macOS host app and EventKit bridge
- `scripts/build-single.mjs` — single-file and extension packaging

## Contributing

Small, focused improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. For security issues, use the private process in [SECURITY.md](SECURITY.md).

## License

MIT © Henry Van Ness. See [LICENSE](LICENSE).

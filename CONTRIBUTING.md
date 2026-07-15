# Contributing to Pulse

Thanks for helping make Pulse better.

## Before you start

- Search existing issues before opening a new one.
- Keep changes focused on one user-visible outcome.
- Do not commit personal data, API keys, signing certificates, provisioning profiles, or generated app bundles.
- Preserve the server-free architecture and the one-screen Safari layout.

## Local checks

```bash
npm install
npm run build:single
git diff --check
```

For native changes, also build the **Pulse** scheme in Xcode after selecting your own development team and bundle identifiers.

## Pull requests

Describe the problem, the chosen fix, and what you verified. Include a screenshot for visual changes and keep unrelated cleanup out of the diff.

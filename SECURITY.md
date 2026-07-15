# Security

## Report a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not include access tokens, personal calendar data, reminder contents, or other sensitive information in a public issue.

## Data boundaries

- Calendar and Reminders data is read through Apple's EventKit framework in the local macOS extension host.
- Reminder completion is written back through EventKit only after an in-page confirmation.
- The Linear personal API key is stored in Safari page or extension local storage and sent directly to Linear's GraphQL API.
- Weather requests send the configured coordinates to Open-Meteo.
- Pulse has no hosted backend and does not require a localhost server.

Use the narrowest Linear key permissions available. If a key is ever committed, pasted into an issue, or otherwise exposed, revoke it immediately and create a replacement.

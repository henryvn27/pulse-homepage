# Security

## Report a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do not include access tokens, personal calendar data, reminder contents, or other sensitive information in a public issue.

## Data boundaries

- Calendar and Reminders data is read through Apple's EventKit framework in the local macOS extension host.
- Reminder completion is written back through EventKit only after an in-page confirmation.
- GitHub Projects opens as a normal Safari link. Pulse stores no GitHub credentials and makes no GitHub API requests.
- On upgrade from the retired tracker build, Pulse removes only its old `pulse-linear-token` local-storage entry; the new code never reads or sends that value.
- Weather requests send the configured coordinates to Open-Meteo.
- Pulse has no hosted backend and does not require a localhost server.

Do not add account tokens to Pulse storage. If a credential is exposed outside its intended secure store, revoke it through the owning service and create a replacement.

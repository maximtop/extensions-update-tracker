# Microsoft Edge Add-ons listing

- Name: Extensions Update Tracker
- Default locale: English
- Short description: Get notified when your extensions update, with a full version history and an unread badge. All local — no account, no tracking.
- Category: Productivity
- Website: https://github.com/maximtop/extensions-update-tracker
- Support: https://github.com/maximtop/extensions-update-tracker/issues
- Privacy policy: https://github.com/maximtop/extensions-update-tracker/blob/master/PRIVACY.md
- Markets: all available markets
- Visibility: public
- Icon: `src/assets/icons/icon-128.png`

Use the 10 localized names and summaries from `src/_locales/` and the 10 full
descriptions from `CHROME_STORE_DESCRIPTION.md`. The Edge package is
`dist/release/edge.zip`.

Permission explanations:

- `management`: detects installed extension version changes and powers the
  optional user-enabled auto-disable protection.
- `notifications`: shows local desktop update alerts.
- `storage`: keeps the update history and settings on the device.

The extension has no host permissions, content scripts, analytics, accounts,
network requests or remote code. All extension metadata and history stays in
browser-local storage.

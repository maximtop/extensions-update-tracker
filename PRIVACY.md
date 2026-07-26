# Privacy Policy

**Extensions Update Tracker**

Last updated: 25 July 2026

## Summary

Extensions Update Tracker does not collect, transmit or sell any data. It makes
no network requests. Everything it records stays in your browser's local
storage on your own device.

## What is stored, and where

To tell you when an extension has updated, the extension keeps a local record
for each extension you have installed:

- the extension's ID, name and icon reference
- its current version and the versions previously seen
- the time each version was first detected
- whether you have marked that update as read
- your own settings: notifications on/off, notification sound on/off,
  auto-disable on update on/off, and which extensions you have muted

This record is written to `chrome.storage.local`, which is storage private to
this extension inside your browser profile. It is never uploaded anywhere.

If you have Chrome profile sync enabled, Chrome may sync your profile according
to your own Google account settings. That is a browser feature, outside this
extension's control; the extension itself does not use `chrome.storage.sync`
and does not send data to any server.

## What is not collected

- No accounts, sign-in or identifiers of any kind
- No analytics, telemetry or crash reporting
- No browsing history, page content or form input — the extension has no host
  permissions and injects no content scripts, so it cannot read the pages you
  visit
- No advertising, and no sharing or sale of data to third parties

## Permissions and why they are needed

| Permission      | Why it is required                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `management`    | Read which extensions are installed and their version numbers — this is what makes update detection possible. The same permission is used by the optional "auto-disable on update" setting to turn an extension off. |
| `notifications` | Show the desktop notification when an extension updates.                                                                       |
| `storage`       | Keep the update history and your settings on your device.                                                                      |

## Removing your data

- **Uninstall a tracked extension** — its update history is deleted
  automatically.
- **Reset settings** — Settings → Reset returns all preferences to their
  defaults.
- **Uninstall Extensions Update Tracker** — Chrome removes the extension's local
  storage along with it, deleting the whole update history.

## Changes to this policy

Any change to this policy will be published in this file in the project
repository, with the "Last updated" date above changed accordingly.

## Contact

Questions or concerns: open an issue at
<https://github.com/maximtop/extensions-update-tracker/issues> or email
<me@maximtop.dev>.

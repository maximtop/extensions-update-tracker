# Firefox reviewer instructions

Extensions Update Tracker records version changes for the add-ons installed in
the same Firefox profile. It keeps the history locally and can show a desktop
notification. It has no account, analytics, remote service, host permissions,
content scripts or network requests.

## Reproduce the package

Use the source archive from the same `v1.3.1` tag as the submitted Firefox ZIP.
With Node.js 24 and pnpm 10.33.4, run:

```sh
pnpm install --frozen-lockfile
pnpm release firefox
```

The store-ready result is `dist/release/firefox.zip`. The source includes the
TypeScript and React application, Rspack configuration, 10 locale catalogs,
tests and the exact dependency lockfile. Dependencies come from the npm
registry. No credentials or environment-specific files are required. The
bundles are generated but are not minified, so the matching source archive is
attached for review.

## Test the behavior

1. Install the add-on in Firefox 140 or newer on desktop.
2. Open the toolbar popup and then the full update-history page.
3. Confirm installed add-ons appear with their current versions.
4. Install or update another temporary test add-on. Confirm the new version is
   recorded and the unread badge changes.
5. Open the history, mark the update as read, and test undo, search, sorting and
   per-add-on notification muting.
6. Restart Firefox and confirm the locally stored history and settings remain.
7. Confirm the extension creates no network requests.

Firefox does not support enabling or disabling ordinary extensions through
`management.setEnabled`, so the Firefox UI omits the optional Chromium-only
auto-disable setting. Firefox also does not support notification buttons; its
notifications contain the icon, title and version-change message. Clicking the
notification body opens the update history.

## Permissions and data handling

- `management`: read the installed add-on list, names, versions and lifecycle
  events required to detect updates. It also removes history when an add-on is
  uninstalled. The Firefox package does not try to enable or disable ordinary
  add-ons.
- `notifications`: display local update notifications.
- `storage`: keep update history, read state, muted add-ons and settings in
  extension-local browser storage.

The manifest declares `data_collection_permissions.required: ["none"]`.
Nothing is collected or transmitted outside the extension. There is no browsing
history access, page access, telemetry, advertising or developer-operated
backend.

Gecko ID: `extensions-update-tracker@maximtop.dev`

License: MIT

Source: https://github.com/maximtop/extensions-update-tracker

Support: https://github.com/maximtop/extensions-update-tracker/issues or
me@maximtop.dev

## Automated validator warnings

The AMO linter reports no errors. Its `innerHTML` warnings come from the stock
React DOM renderer; application source does not use `innerHTML` or
`dangerouslySetInnerHTML`. Its `Function` warnings come from generated Rspack
runtime/global-detection code and development helpers bundled by dependencies;
application source does not use `eval` or the `Function` constructor, and the
extension CSP does not permit dynamic code.

The data-consent warning concerns Firefox for Android 140. This submission is
desktop-only, so no `gecko_android` target is declared. Desktop Firefox 140
supports the required manifest declaration.

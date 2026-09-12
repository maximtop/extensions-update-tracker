# Releasing

Extensions Update Tracker follows the same three-store release and deployment
contract as the other extensions. The cross-repository contract and extraction
boundary are documented in
[Shared store deployment](STORE_DEPLOYMENT.md).

## Cut a release

1. Bump `version` in `package.json` to a semantic `X.Y.Z`, merge the change to
   `master`, and tag that exact commit as `vX.Y.Z`.
2. Push the tag. `.github/workflows/release.yml` runs `pnpm check` and
   `pnpm release`, verifies the built manifests, and publishes:
   - `extensions-update-tracker-<version>-chrome.zip`
   - `extensions-update-tracker-<version>-edge.zip`
   - `extensions-update-tracker-<version>-firefox.zip`
   - `extensions-update-tracker-<version>-source.zip`
   - `SHA256SUMS.txt`
3. Run the store workflows for the published release:

   ```sh
   gh workflow run deploy-chrome-store.yml -f tag=vX.Y.Z
   gh workflow run deploy-edge-addons.yml -f tag=vX.Y.Z
   gh workflow run deploy-firefox-amo.yml -f tag=vX.Y.Z
   ```

Running `release.yml` manually is a dry run. Every store workflow is also
manual and supports `mode=validate`, which checks the release without sending
anything to a store. Chrome submission uses deferred publishing; the final
publish action after approval remains in the Chrome Developer Dashboard.

## Repository configuration

The public store IDs are in `.env.example`; `1password.env.example` contains
references to the shared credential items. GitHub Actions uses the variables
and secrets listed in
[Shared store deployment](STORE_DEPLOYMENT.md#github-configuration).

The old Chrome-only release-event workflow is no longer used. Release creation
and store submission are separate, and all three stores consume the same
immutable GitHub Release assets.

## Browser packages

`pnpm release` writes `dist/release/chrome.zip`, `dist/release/edge.zip`, and
`dist/release/firefox.zip`. Chrome and Edge use a service worker. Firefox uses
an event-page background script, the permanent ID
`extensions-update-tracker@maximtop.dev`, a Firefox 140 minimum, and declares
that no data is collected or transmitted. All packages contain the same ten
locale catalogs.

Firefox omits the optional auto-disable setting because it cannot enable or
disable ordinary extensions through `management.setEnabled`. Its notifications
also omit Chromium-only buttons and flags. The update history, unread badge,
notification, search, sorting, and mute flows remain available.

Reviewer instructions and Firefox listing fields live in
`docs/FIREFOX_REVIEW.md` and `docs/FIREFOX_LISTING.md`; Edge listing fields live
in `docs/EDGE_LISTING.md`.

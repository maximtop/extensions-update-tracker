# Releasing

Extensions Update Tracker follows the same three-store release and deployment
contract as the other extensions. The cross-repository contract and extraction
boundary are documented in
[Shared store deployment](STORE_DEPLOYMENT.md).

## Cut a release

Use the manual `Please release` workflow for the normal path:

```sh
gh workflow run please-release.yml -f version=X.Y.Z
```

The requested version must be a stable `X.Y.Z` newer than `package.json`.
Release Please creates or updates a release PR that changes `package.json` and
`CHANGELOG.md`. Merging that PR is the release approval: `release.yml` runs the
full checks, builds the archives, creates `vX.Y.Z`, and publishes the GitHub
Release. Nothing is sent to a browser store. Use `-f mode=validate` to check a
version without creating a branch or PR.

The workflow uses the built-in `GITHUB_TOKEN` unless an optional
`RELEASE_PLEASE_TOKEN` is configured. The built-in token requires the repository
setting that allows Actions to create pull requests. It does not start ordinary
PR workflows for the PR it creates, so `release.yml` deliberately repeats the
full quality and artifact checks after merge and creates no tag or release if
they fail. A fine-grained token can be used when CI on the release PR itself is
also wanted.

The manual version-and-tag fallback remains available:

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

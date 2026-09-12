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

With the built-in `GITHUB_TOKEN`, GitHub asks a maintainer to select
**Approve workflows to run** on the release PR. Then wait for its required
`check` before merging. An optional `RELEASE_PLEASE_TOKEN` (GitHub App token or
PAT) lets GitHub start PR CI without that approval; no extra token is required
for the default flow. A separate manual CI run does not replace approval of
the PR workflow. See [GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

The release workflow reuses
the same CI workflow and publishes its verified artifacts without rebuilding.
For Kode Injector, publication also waits for the signed native helpers.

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

## CI and branch protection

CI runs for pull requests, master pushes, and manual dispatch, and is reusable
by `Release`. Lint, type checking, tests, packaging, and applicable locale,
E2E, or platform checks appear as separate jobs. `check` aggregates their
results and fails if any required job fails or is cancelled.

All jobs have explicit timeouts and use the pinned package manager with the
pnpm cache. Release candidates and failure diagnostics are retained for 14
days. The common package action verifies actual ZIP integrity, version,
background entry points, icons, and presence of source locale catalogs; it
does not re-review translations or require byte identity with source JSON.

Master requires a pull request, resolved review conversations, and the green
`check` against an up-to-date branch. No second-person approval is required.
Force pushes and deleting master are disabled. Feature branches can be deleted
after merge.

## Deploy one store or all three

Run **Deploy stores**, select `chrome`, `firefox`, `edge`, or `all`, choose a
release tag (blank selects the latest stable release once), and choose
`validate` or `submit`. Every selected store must pass validation before any
submission begins. Submission results and moderation remain independent;
successful submissions are not rolled back if another store later fails.

```sh
gh workflow run deploy-stores.yml -f target=all -f tag=vX.Y.Z -f mode=submit
```

The individual store workflows remain available, including Edge upload-only
and Firefox status. Chrome still requires final publication after approval.

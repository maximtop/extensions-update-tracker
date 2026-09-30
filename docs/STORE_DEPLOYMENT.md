# Store deployment

Releases reach Chrome, Edge, and Firefox through one release-to-store
boundary. Store submission is deliberately separate from release
creation, so creating a GitHub Release never changes a store listing by itself.

## Release contract

A `vX.Y.Z` tag reachable from `master` must match `package.json`. The release
workflow reuses CI and publishes its verified candidate after all checks and
applicable native signing jobs succeed. It publishes the
browser ZIPs, a source ZIP, and `SHA256SUMS.txt`. Running `release.yml` manually
is a dry run and publishes nothing.

Every store workflow is manually dispatched and reads an existing immutable
GitHub Release. It downloads the exact browser archive, verifies the checksum
and packaged manifest, and never rebuilds the release during deployment.

```sh
gh workflow run deploy-chrome-store.yml -f tag=vX.Y.Z -f mode=validate
gh workflow run deploy-edge-addons.yml -f tag=vX.Y.Z -f mode=validate
gh workflow run deploy-firefox-amo.yml -f tag=vX.Y.Z -f mode=validate
```

The blank `tag` input selects the latest stable published release. Use the
**Deploy stores** workflow to select `chrome`, `firefox`, `edge`, or `all`.
It resolves one tag and validates every selected store before any submission:

```sh
gh workflow run deploy-stores.yml -f target=all -f tag=vX.Y.Z -f mode=validate
gh workflow run deploy-stores.yml -f target=firefox -f tag=vX.Y.Z -f mode=submit
```

| Store | Modes | External effect |
| --- | --- | --- |
| Chrome | `validate`, `submit` | `submit` uploads and requests review with deferred publishing. |
| Edge | `validate`, `upload`, `submit` | `upload` fills the draft; `submit` also requests certification. |
| Firefox | `validate`, `status`, `submit` | `status` reads review state; `submit` uploads package, source, and short reviewer notes that link the full instructions. |

Chrome still needs the final publish action after approval. Edge publishes a
certified submission, and Firefox publishes a reviewed and signed listed
version. A successful workflow proves only the action and state reported in its
job summary.

## Deployment files

The release-to-store flow lives in these files:

- `.github/actions/setup-toolchain/action.yml`
- `.github/actions/package-extension/action.yml`
- `.github/workflows/deploy-stores.yml`
- `.github/workflows/deploy-chrome-store.yml`
- `.github/workflows/deploy-edge-addons.yml`
- `.github/workflows/deploy-firefox-amo.yml`
- `scripts/deploy/cli.ts`
- `scripts/deploy/prepare.ts`
- `scripts/deploy/release.ts`
- `scripts/deploy/firefox.ts`
- `scripts/deploy/firefox-cli.ts`
- the matching files under `tests/deploy`

Repository-specific values live in `scripts/deploy/constants.ts`: the release
asset prefix, enabled stores, Firefox extension ID, required source files,
reviewer-notes path and summary. The deployment scripts and workflows read
them from there and hold no repository values of their own. Build and package
inputs stay in `.github/workflows/ci.yml`; the release title stays in
`.github/workflows/release.yml`.

## GitHub configuration

Public identifiers are repository variables. Credentials are repository
secrets.

| Kind | Name |
| --- | --- |
| Variable | `CHROME_APP_ID` |
| Variable | `CHROME_PUBLISHER_ID` |
| Variable | `EDGE_PRODUCT_ID` |
| Variable | `FIREFOX_AMO_ID` |
| Secret | `CHROME_CLIENT_ID` |
| Secret | `CHROME_CLIENT_SECRET` |
| Secret | `CHROME_REFRESH_TOKEN` |
| Secret | `EDGE_CLIENT_ID` |
| Secret | `EDGE_API_KEY` |
| Secret | `FIREFOX_CLIENT_ID` |
| Secret | `FIREFOX_CLIENT_SECRET` |

The store products must already exist. `.env.example` lists the same names for
local fallback commands, and `1password.env.example` contains references only.
Never commit resolved credential values.

# Releasing to the Chrome Web Store

Publishing is automated with GitHub Actions and AdGuard's
[`go-webext`](https://github.com/adguardteam/go-webext) CLI. Nothing goes live
automatically — a build is submitted to the store for review with **staged
(deferred) publishing**, and the final "publish" click stays manual.

## How a release flows

1. **Tag** a commit on `master`: `git tag vX.Y.Z && git push origin vX.Y.Z`.
   The **git tag is the source of truth** for the version — CI stamps it into
   the manifest at build time, so you do **not** need to bump `package.json`
   for a release (the `version` field there is only a local-dev marker).
2. **`release.yml`** builds the Chrome bundle, runs the e2e suite, and creates
   a **draft** GitHub Release with `chrome.zip` + `SHA256SUMS`.
3. **Publish the draft Release** in the GitHub UI once you're happy with it.
4. Publishing the Release triggers **`deploy-chrome-store.yml`**, which uploads
   `chrome.zip` to the Chrome Web Store and submits it for review (staged).
5. After the store approves it (email), **publish the approved version manually**
   in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   within ~30 days (an approved staged submission otherwise reverts to a draft).

`workflow_dispatch` fallbacks exist on both workflows: `release.yml` can be run
manually as a build dry run, and `deploy-chrome-store.yml` accepts a `tag` input
to re-deploy an already-published Release.

## One-time repository setup

The workflows need one repository **variable** and four **secrets**
(Settings → Secrets and variables → Actions):

| Name | Kind | Value |
| --- | --- | --- |
| `CHROME_APP_ID` | variable | `cdgepknigaiclfdmjckaknepgcighbnh` (this extension's store ID) |
| `CHROME_CLIENT_ID` | secret | Google OAuth client ID |
| `CHROME_CLIENT_SECRET` | secret | Google OAuth client secret |
| `CHROME_REFRESH_TOKEN` | secret | OAuth refresh token |
| `CHROME_PUBLISHER_ID` | secret | Chrome Web Store publisher ID |

The four secrets are **per-Google-publisher-account**, not per-extension. If
this extension lives under the same publisher account as another project that
already has them (e.g. `kode-injector`), reuse the existing values verbatim —
only `CHROME_APP_ID` is specific to this extension. For example, reusing an
existing local `.env`:

```bash
set -a; source /path/to/other-project/.env; set +a
REPO=maximtop/extensions-update-tracker
gh secret   set CHROME_CLIENT_ID     --repo "$REPO" --body "$CHROME_CLIENT_ID"
gh secret   set CHROME_CLIENT_SECRET --repo "$REPO" --body "$CHROME_CLIENT_SECRET"
gh secret   set CHROME_REFRESH_TOKEN --repo "$REPO" --body "$CHROME_REFRESH_TOKEN"
gh secret   set CHROME_PUBLISHER_ID  --repo "$REPO" --body "$CHROME_PUBLISHER_ID"
gh variable set CHROME_APP_ID        --repo "$REPO" --body "cdgepknigaiclfdmjckaknepgcighbnh"
```

To mint fresh credentials instead: create a Web-application OAuth client
(redirect URI `https://developers.google.com/oauthplayground`, scope
`https://www.googleapis.com/auth/chromewebstore`, consent screen "In
production"), then exchange an authorization code for a refresh token via the
OAuth Playground.

## Related workflows

- **`ci.yml`** — lint, unit tests, e2e, and a release build on every push to
  `master` and every pull request.
- **`release.yml`** — build + draft GitHub Release on `vX.Y.Z` tags.
- **`deploy-chrome-store.yml`** — upload + staged submit when a Release is
  published.

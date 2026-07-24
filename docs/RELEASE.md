# Releasing to the Chrome Web Store

Publishing is automated with GitHub Actions and AdGuard's
[`go-webext`](https://github.com/adguardteam/go-webext) CLI. Nothing goes live
automatically — a build is submitted to the store for review with **staged
(deferred) publishing**, and the final "publish" click stays manual.

## How a release flows

Everything is driven by publishing a GitHub Release — no manual `git tag`, no
`package.json` bump.

1. On GitHub, go to **Releases → Draft a new release**.
2. Under **Choose a tag**, type a new tag `vX.Y.Z` ("Create new tag on publish")
   and set **Target: `master`**. The **tag is the source of truth** for the
   version — CI stamps `X.Y.Z` into the manifest at build time, so `package.json`
   never needs a manual bump (its `version` is only a local-dev marker).
3. Write the notes and click **Publish release**. Publishing creates the tag and
   triggers **`deploy-chrome-store.yml`**.
4. The workflow checks out the tag, builds the Chrome bundle, runs the e2e suite,
   attaches `chrome.zip` + `SHA256SUMS` to the Release, then uploads to the
   Chrome Web Store and submits it for review with **staged** publishing.
5. After the store approves it (email), **publish the approved version manually**
   in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   within ~30 days (an approved staged submission otherwise reverts to a draft).

To re-deploy an already-published Release (e.g. after fixing store config), run
`deploy-chrome-store.yml` from the **Actions** tab via **Run workflow** and pass
the release `tag`.

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
- **`deploy-chrome-store.yml`** — on a published Release: build from the tag,
  run e2e, attach the archive to the Release, then upload + staged-submit to the
  Chrome Web Store.

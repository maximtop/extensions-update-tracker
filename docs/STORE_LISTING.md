# Chrome Web Store listing

Operational notes for the listing of Extensions Update Tracker
(`cdgepknigaiclfdmjckaknepgcighbnh`).

## Where the listing content lives

| Field in the dashboard | Source of truth                                        | How it gets there            |
| ---------------------- | ------------------------------------------------------ | ---------------------------- |
| Title                  | `name` in `src/_locales/<locale>/messages.json`        | Read from the package when a new version is published |
| Summary (≤132 chars)   | `description` in `src/_locales/<locale>/messages.json` | Same — publishing a release updates it |
| Description            | `CHROME_STORE_DESCRIPTION.md`                          | Pasted by hand, per language |
| Privacy policy         | `PRIVACY.md`                                           | Linked as the Privacy policy URL |

Run `pnpm convert-store-descriptions` to turn the markdown into the plain text
the store's description field actually accepts
(`dist/store-descriptions/<locale>.txt`) — the field renders no markdown.

**Title and summary only change when a new version is published.** Editing
`messages.json` alone changes nothing in the store.

## Images

The icon, five 1280×800 screenshots, the 440×280 tile and the 1400×560 marquee
currently in the dashboard were uploaded on 2026-07-26. They were produced by a
Playwright generator that rendered the built extension UI and composed the
frames; the generator was later removed from the repo as one-off tooling.

To bring it back (e.g. after a redesign that needs a new screenshot set):

```bash
git checkout df8c6f1 -- store-assets package.json tsconfig.json
```

Its design contract, in one line: capture every UI shot at exactly twice the
pixel size of its slot and draw it at half — a clean 2:1 reduction is what
keeps text stems and 1px hairlines sharp. Local copies of the uploaded PNGs
remain in `store-assets/out/` (untracked).

## Dashboard state, 2026-07-26

- Draft with the new images and descriptions in all ten locales
  (en, de, es, fr, it, ja, ko, pt-BR, ru, zh-CN) **submitted for review**,
  auto-publish on approval. The public listing shows the old content until then.
- Homepage URL: the GitHub repo. Support URL: GitHub issues.
- Privacy policy URL:
  `https://github.com/maximtop/extensions-update-tracker/blob/master/PRIVACY.md`
- Official URL: None — switch to `update-tracker.maximtop.dev` once that site
  is live (the domain is verified in Search Console under maximtop.dev).
- Category: Privacy & Security. Primary language: English.
- Google Analytics: deliberately **not** enabled — impressions, page views and
  install conversion are accepted as unmeasurable. Installs and uninstalls are
  the primary signal.

## Baseline, before the listing refresh

Recorded 2026-07-26 from the dashboard, before submitting for review. Compare
against an equal window after the update goes live.

| Metric                   | Baseline (30 days to 2026-07-25)      | After (30 days to ____) |
| ------------------------ | ------------------------------------- | ----------------------- |
| Installs                 | 119 (+7.03% vs prior period)          |                         |
| Uninstalls               | 13 (−62.5% vs prior period)           |                         |
| Top countries (installs) | United States, Latvia, Bangladesh     |                         |
| Top languages (installs) | en-US 48%, zh-CN 26%, en-GB 19%       |                         |
| Top OS (installs)        | ChromeOS 55%, Windows 24%, Linux 18%  |                         |

Known starting point: 150 users, 5.0 from 3 ratings, version 1.3.0.

## Working rules

- Change **either** the visuals **or** the text per cycle from here on, or the
  before/after comparison says nothing about which lever moved the number.
  (The 2026-07-26 refresh changed both deliberately: the old listing was
  incomplete — two screenshots, no privacy URL — not an A/B variant.)
- Only localise further based on install data. It already points somewhere:
  zh-CN is the second install language at 26%.
- No paid ads until the organic listing shows a healthy installs-to-uninstalls
  ratio over a full cycle (currently ~11%, which is acceptable).

# Chrome Web Store listing assets

Everything needed to refresh the store listing: the generated images, where the
listing text lives, and the checklist for the parts that can only be done by
hand in the Developer Dashboard.

## Regenerating the images

```bash
pnpm store-assets
```

This builds the release bundle and writes `store-assets/out/`:

| File                              | Size     | Where it goes in the dashboard          |
| --------------------------------- | -------- | --------------------------------------- |
| `store-icon-128.png`              | 128×128  | Store listing → Store icon              |
| `screenshot-1-update-detected.png`| 1280×800 | Screenshots (first — most visitors see only this one) |
| `screenshot-2-update-history.png` | 1280×800 | Screenshots                             |
| `screenshot-3-unread-workflow.png`| 1280×800 | Screenshots                             |
| `screenshot-4-settings.png`       | 1280×800 | Screenshots                             |
| `screenshot-5-version-history.png`| 1280×800 | Screenshots                             |
| `promo-small-tile-440x280.png`    | 440×280  | Small promo tile                        |
| `promo-marquee-1400x560.png`      | 1400×560 | Marquee promo tile                      |
| `raw/*.png`                       | —        | Unstyled captures, for debugging only   |

The marquee tile is only used if the extension is featured, and the promo video
is optional — neither should hold up a listing update.

### How the screenshots are made

The generator renders `dist/release/chrome/{popup,options}.html` — the same
bundle that ships to users — in headless Chromium, and replaces only the
background service worker with a scripted stand-in (`mock-extension-api.ts`).
The UI, the CSS and the strings are the real ones; what is scripted is the data
behind them. Nothing here is a hand-built mockup, so a UI change lands in the
screenshots by re-running the generator rather than by redrawing anything.

The clock is frozen at a fixed instant, so "2 hours ago" labels are identical
between runs and re-generating produces no spurious diff.

**The 2:1 rule — this is what keeps the output sharp.** Every capture is taken
at exactly twice the pixel size of the box it will occupy, and the composer
draws it at exactly half. A clean 2:1 reduction folds four device pixels into
one and leaves the UI's 1px hairlines exactly 1px wide.

This used to be wrong, and the frames were visibly soft. `max-width`/
`max-height` on the image let whatever space the box model had left over decide
the scale, which produced ratios of 0.427, 0.500, 0.576, 0.601 and 0.721 — at
0.427 the UI was drawn *smaller than a plain non-retina screenshot*, and its
text never reached full ink. So: capture sizes are derived from the destination,
`compose.ts` reads each PNG's own IHDR header rather than trusting arithmetic,
and a capture that will not fit its slot throws instead of being silently
scaled. Never reintroduce a `max-width` or `max-height` on `.shot`.

Two consequences worth knowing. The popup is captured twice, at 3x and 2x,
because it appears at two sizes and one capture can only be an exact 2:1 source
for one of them. And the promo icons are drawn at 128px and 32px — exactly 1/1
and 1/4 of the 128px source — because any other size resamples them fractionally.

**One grid.** Every non-split frame puts the UI in the same box: 1152px wide
starting at x=64, with the caption on the same left edge and a fixed-height
caption block so editing a headline cannot move or resize the screenshot beside
it. Cards that changed width and drifted between frames were what made the set
read as crooked when flipped through as thumbnails.

**The demo data is deliberately messy** (`demo-data.ts`). The names are invented
— putting real extensions' names and icons in our own listing would use someone
else's branding to promote this product, which the store's listing requirements
forbid. Within that constraint the fixture avoids looking like a fixture: ten
brand-shaped names of uneven length, version strings in four schemes (semver,
four-segment, two-segment and date-based), updates that cluster on one day and
then go quiet for a month, a hotfix three hours after its release, and one
unread item from nine days ago sitting *below* newer entries you have already
read. Tidy data is the clearest tell that a screenshot was staged.

To change a caption, edit `SCREENSHOTS` in `compose.ts`. To change what the UI
shows, edit `demo-data.ts`. To change the frame design, edit `templates.ts` —
its design tokens are copied from `src/common/styles/theme.css`, so the promo
material and the product stay one brand.

## Listing text

| Field in the dashboard | Source of truth                                     | How it gets there            |
| ---------------------- | --------------------------------------------------- | ---------------------------- |
| Title                  | `name` in `src/_locales/<locale>/messages.json`      | Taken from the manifest when a new version is published |
| Summary (≤132 chars)   | `description` in `src/_locales/<locale>/messages.json` | Same — publishing a release updates it |
| Description            | `CHROME_STORE_DESCRIPTION.md`                        | Pasted by hand, per language |

Run `pnpm convert-store-descriptions` to turn the markdown into the plain text
the store actually accepts (`dist/store-descriptions/<locale>.txt`) — the
description field renders no markdown at all.

**The title and summary only change when a new version is published.** Editing
`messages.json` alone changes nothing in the store.

The title stays `Extensions Update Tracker`: it is short, it says what the
extension does, and it is what the existing users and reviews are attached to.
Renaming an already-indexed listing costs more than it gains.

## Dashboard checklist

Things that cannot be done from this repository.

- [ ] Upload the 5 screenshots, the store icon and the small promo tile
- [ ] Paste the description for every language you have listed
- [ ] Confirm the category is still **Privacy & Security** and the primary
      language is English
- [ ] Set **Official URL / Homepage** — `https://github.com/maximtop/extensions-update-tracker`
      until `update-tracker.maximtop.dev` is live, then switch it to the domain
- [ ] Set **Support URL** — `https://github.com/maximtop/extensions-update-tracker/issues`
- [ ] Set **Privacy policy URL** — `https://github.com/maximtop/extensions-update-tracker/blob/master/PRIVACY.md`
- [ ] Fill in the privacy practices tab: single purpose, the justification for
      each of `management`, `notifications` and `storage`, and the
      "no data is sold or transferred" declarations — `PRIVACY.md` has the
      wording for all of it
- [x] ~~Turn on Google Analytics for the listing~~ — deliberately skipped: the
      owner opted against GA. The before/after comparison uses installs,
      uninstalls and total users instead; impressions, page views and install
      conversion stay unmeasurable, and that is accepted.

## Baseline, before the update

Record the last 28 days from the dashboard's listing metrics, then compare the
28 days after. Fill this in when the baseline is taken.

| Metric                       | Baseline (30 days to 2026-07-25) | After (30 days to ____) |
| ---------------------------- | -------------------------------- | ----------------------- |
| Impressions                  | n/a — GA opt-in declined         |                         |
| Listing page views           | n/a — GA opt-in declined         |                         |
| Installs                     | 119 (+7.03% vs prior period)     |                         |
| Uninstalls                   | 13 (−62.5% vs prior period)      |                         |
| Install conversion (installs / page views) | n/a — GA opt-in declined |                  |
| Top countries (installs)     | United States, Latvia, Bangladesh |                        |
| Top languages (installs)     | en-US 48%, zh-CN 26%, en-GB 19%  |                         |
| Top OS (installs)            | ChromeOS 55%, Windows 24%, Linux 18% |                     |

The dashboard's date-range picker reports 30-day windows, so the table uses 30
days rather than the 28 the docs suggest — what matters is comparing equal
windows. Impressions and page views only appear after a Google Analytics
opt-in, which the owner has deliberately declined — installs and uninstalls
are the primary signal for this listing.

Known starting point at the time this was written: 150 users, 5.0 from 3
ratings, version 1.3.0. Baseline recorded 2026-07-26, before submitting the
listing refresh for review.

Change **either** the visuals **or** the text in one cycle, never both, or the
comparison says nothing about which one moved the number. Only localise into a
new language once the analytics show demand for it.

Do not buy ads until the organic listing shows a healthy install conversion and
an acceptable installs-to-uninstalls ratio — paid traffic against a listing that
does not convert only pays for the same result faster.

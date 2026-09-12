# Firefox listing

- Name: Extensions Update Tracker
- Default locale: English (US)
- Summary: Get notified when your extensions update, with a full version history and an unread badge. All local — no account, no tracking.
- Category: Privacy & Security
- Platform: Firefox for desktop, version 140 or newer
- License: MIT
- Homepage: https://github.com/maximtop/extensions-update-tracker
- Support: https://github.com/maximtop/extensions-update-tracker/issues
- Support email: me@maximtop.dev
- Privacy policy: https://github.com/maximtop/extensions-update-tracker/blob/master/PRIVACY.md
- Icon: `src/assets/icons/icon-128.png`
- Reviewer notes: `docs/FIREFOX_REVIEW.md`

The package and listing ship 10 locales: English, German, Spanish, French,
Italian, Japanese, Korean, Brazilian Portuguese, Russian and Simplified Chinese.
Use the localized names and summaries in `src/_locales/` and the corresponding
descriptions in `CHROME_STORE_DESCRIPTION.md`, removing the auto-disable feature
and its permission clause because Firefox does not support that operation for
ordinary extensions.

Data collection: none. The add-on reads installed add-on metadata through the
browser's `management` API and stores update history locally. It makes no
network requests and has no access to visited pages.

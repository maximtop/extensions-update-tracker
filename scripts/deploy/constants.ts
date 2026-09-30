/**
 * @file Configuration for this repository's store deployment flow.
 */

/**
 * Prefix of every release asset: `<prefix>-<version>-<browser>.zip` and
 * `<prefix>-<version>-source.zip`, listed in `SHA256SUMS.txt`.
 */
export const RELEASE_ASSET_PREFIX = 'extensions-update-tracker';

/**
 * Every store the deployment flow knows.
 */
export const Store = {
    Chrome: 'chrome',
    Edge: 'edge',
    Firefox: 'firefox',
} as const;

/**
 * Stores this extension is deployed to; each one has a deploy workflow.
 */
export const STORE_TARGETS = [Store.Chrome, Store.Edge, Store.Firefox] as const;

/**
 * Store this repository can deploy to.
 */
export type StoreTarget = typeof STORE_TARGETS[number];

/**
 * Firefox add-on ID from `browser_specific_settings.gecko.id`.
 */
export const GECKO_ID = 'extensions-update-tracker@maximtop.dev';

/**
 * Files the Firefox source archive must contain.
 */
export const SOURCE_REQUIRED_FILES = [
    'package.json',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'src/manifest.json',
    'scripts/build/index.ts',
    'scripts/build/manifest.ts',
    'scripts/build/rspack-config.ts',
];

/**
 * Full reviewer instructions. They ship in the release source archive and are linked, pinned to
 * the release tag, from the notes sent to AMO.
 */
export const AMO_REVIEW_NOTES_PATH = 'docs/FIREFOX_REVIEW.md';

/**
 * Filename of the generated approval notes consumed by preflight and upload; empty when the
 * release source archive has no reviewer instructions.
 */
export const AMO_APPROVAL_NOTES_FILENAME = 'approval-notes.txt';

/**
 * Opening of the approval notes sent to AMO: what the extension does and what it does not do.
 * The full reviewer instructions are linked after it, so the notes stay short.
 */
export const AMO_APPROVAL_NOTES_SUMMARY = 'Records version changes of the add-ons installed in the '
    + 'same Firefox profile, keeps the history locally and can show a desktop notification. No '
    + 'extension account, no remote code, no network requests.';

/**
 * Our own limit for the length of AMO `approval_notes`, in Unicode code points after trimming.
 * AMO itself rejects notes over 3000 characters with HTTP 400 (`max_length=3000` on
 * `Version.approval_notes` in addons-server,
 * https://github.com/mozilla/addons-server/blob/5e222bdab92d/src/olympia/versions/models.py#L311-L313).
 * The margin absorbs any difference between how we count and how AMO counts, so the check does
 * not have to replicate AMO's whitespace trimming.
 */
export const AMO_APPROVAL_NOTES_OWN_LIMIT = 2500;

/**
 * Shape of a release tag; the version is the tag without the `v` prefix.
 */
export const RELEASE_TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

/**
 * Directory the deploy workflows download the release assets into.
 */
export const STORE_UPLOAD_DIRECTORY = 'store-upload';

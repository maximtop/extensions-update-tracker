/**
 * @file Configuration for this repository's shared extension deployment flow.
 */

/**
 * Prefix of every release asset: `<prefix>-<version>-<browser>.zip` and
 * `<prefix>-<version>-source.zip`, listed in `SHA256SUMS.txt`.
 */
export const RELEASE_ASSET_PREFIX = 'extensions-update-tracker';

/**
 * Stores this extension is deployed to; each one has a deploy workflow.
 */
export const STORE_TARGETS = ['chrome', 'edge', 'firefox'] as const;

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
 * Reviewer notes submitted to AMO with every new Firefox version.
 */
export const AMO_REVIEW_NOTES_PATH = 'docs/FIREFOX_REVIEW.md';

/**
 * Filename of the extracted reviewer notes consumed by preflight and upload.
 */
export const AMO_APPROVAL_NOTES_FILENAME = 'approval-notes.txt';

/**
 * Shape of a release tag; the version is the tag without the `v` prefix.
 */
export const RELEASE_TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

/**
 * Directory the deploy workflows download the release assets into.
 */
export const STORE_UPLOAD_DIRECTORY = 'store-upload';

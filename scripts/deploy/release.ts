/**
 * @file Validation of published store assets, independent of GitHub and store credentials.
 * Identical in every extension repository; repository specifics live in ./constants.
 */

import { createHash } from 'node:crypto';

import AdmZip from 'adm-zip';

import {
    AMO_REVIEW_NOTES_PATH,
    GECKO_ID,
    RELEASE_TAG_PATTERN,
    SOURCE_REQUIRED_FILES,
} from './constants';

/**
 * GitHub metadata required to select a stable release.
 */
export type PublishedRelease = {
    /**
     * Git tag of the release, `vX.Y.Z` for stable releases.
     */
    tagName: string;

    /**
     * Whether the release is still a draft.
     */
    isDraft: boolean;

    /**
     * Whether the release is marked as a pre-release.
     */
    isPrerelease: boolean;
};

/**
 * Read a nested field of parsed JSON without assuming its shape.
 *
 * @param value Parsed JSON value.
 * @param keys Property path to follow.
 *
 * @returns The nested value, or undefined when any step is missing.
 */
const read = (value: unknown, ...keys: string[]): unknown => keys.reduce<unknown>(
    (current, key) => {
        if (current && typeof current === 'object') {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    },
    value,
);

/**
 * Validate a stable published release and return its version.
 *
 * @param release Metadata returned by GitHub.
 *
 * @returns Version without the `v` prefix.
 *
 * @throws If the release is not a stable semantic version.
 */
export const releaseVersion = (release: PublishedRelease): string => {
    if (!RELEASE_TAG_PATTERN.test(release.tagName) || release.isDraft || release.isPrerelease) {
        throw new Error('Select a published stable release with a vX.Y.Z tag.');
    }
    return release.tagName.slice(1);
};

/**
 * Fail before upload if any required configuration is missing.
 *
 * @param names Required environment variable names.
 * @param env Environment to inspect without logging secret values.
 *
 * @throws If configuration is incomplete.
 */
export const requireConfiguration = (names: string[], env: NodeJS.ProcessEnv): void => {
    const missing = names.filter((name) => !env[name]?.trim());
    if (missing.length) {
        throw new Error(`Missing store configuration: ${missing.join(', ')}`);
    }
};

/**
 * Verify exactly one checksum entry for a named asset.
 *
 * @param name Exact basename of the asset.
 * @param bytes Downloaded asset.
 * @param checksums Published SHA256SUMS.txt contents.
 *
 * @throws If the checksum is absent, duplicated or incorrect.
 */
export const verifyChecksum = (name: string, bytes: Buffer, checksums: string): void => {
    const entries = checksums
        .split(/\r?\n/)
        .map((line) => line.match(/^([a-f0-9]{64}) [ *](?:\.\/)?(.+)$/));
    const matches = entries.filter((entry) => entry?.[2] === name);
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (matches.length !== 1 || matches[0]?.[1] !== digest) {
        throw new Error(`Missing, duplicate or mismatched SHA-256 for ${name}`);
    }
};

/**
 * Inspect the actual submitted manifest rather than the deployment checkout.
 *
 * @param bytes Extension ZIP or signed XPI.
 * @param version Selected release version.
 * @param browser Store target.
 *
 * @throws If the package identity or background format is incorrect.
 */
export const verifyManifest = (bytes: Buffer, version: string, browser: string): void => {
    const archive = new AdmZip(bytes);
    const manifests = archive.getEntries().filter((entry) => entry.entryName === 'manifest.json');
    const [manifestEntry] = manifests;
    if (manifests.length !== 1 || !manifestEntry) {
        throw new Error('Package must contain exactly one root manifest.json');
    }
    const manifest: unknown = JSON.parse(archive.readAsText(manifestEntry));
    if (read(manifest, 'version') !== version || read(manifest, 'manifest_version') !== 3) {
        throw new Error('Package manifest version does not match the selected release');
    }
    const serviceWorker = read(manifest, 'background', 'service_worker');
    if (browser === 'firefox') {
        const backgroundScripts = read(manifest, 'background', 'scripts');
        const hasValidBackground = backgroundScripts === undefined
            || Array.isArray(backgroundScripts);
        if (read(manifest, 'browser_specific_settings', 'gecko', 'id') !== GECKO_ID
            || !hasValidBackground
            || serviceWorker) {
            throw new Error('Incorrect Firefox Gecko ID or background');
        }
    } else if (!serviceWorker) {
        throw new Error('Chromium package has no service worker');
    }
};

/**
 * Check matching source metadata and obtain reviewer notes from that release.
 *
 * @param bytes Source ZIP from the same release.
 * @param version Selected package version.
 * @param requireNotes Whether this is a new Firefox submission.
 *
 * @returns Reviewer notes, empty when the archive has none.
 *
 * @throws If the source is incomplete or belongs to another version.
 */
export const verifySource = (bytes: Buffer, version: string, requireNotes: boolean): string => {
    const zip = new AdmZip(bytes);
    const missing = SOURCE_REQUIRED_FILES.filter((file) => !zip.getEntry(file));
    if (missing.length) {
        throw new Error(`Source archive is missing ${missing.join(', ')}`);
    }
    const pkg: unknown = JSON.parse(zip.readAsText('package.json'));
    if (read(pkg, 'version') !== version) {
        throw new Error('Source package version does not match the selected release');
    }
    const notes = zip.getEntry(AMO_REVIEW_NOTES_PATH) ? zip.readAsText(AMO_REVIEW_NOTES_PATH) : '';
    if (requireNotes && !notes.trim()) {
        throw new Error(
            `Source has no ${AMO_REVIEW_NOTES_PATH}; use the Developer Hub for this release`,
        );
    }
    return notes;
};

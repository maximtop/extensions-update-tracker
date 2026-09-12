/**
 * @file Resolve one published release and verify its immutable store upload inputs.
 * Follows the shared extension deployment flow; repository specifics live in ./constants.
 */

import { execFileSync } from 'node:child_process';
import {
    appendFileSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

import {
    AMO_APPROVAL_NOTES_FILENAME,
    RELEASE_ASSET_PREFIX,
    RELEASE_TAG_PATTERN,
    STORE_TARGETS,
    STORE_UPLOAD_DIRECTORY,
} from './constants';
import {
    releaseVersion,
    requireConfiguration,
    verifyChecksum,
    verifyManifest,
    verifySource,
} from './release';

import type { StoreTarget } from './constants';
import type { PublishedRelease } from './release';

/**
 * Store identifiers and credentials each target needs before any asset is downloaded.
 */
const STORE_CONFIGURATION: Record<string, string[]> = {
    chrome: [
        'CHROME_APP_ID',
        'CHROME_PUBLISHER_ID',
        'CHROME_CLIENT_ID',
        'CHROME_CLIENT_SECRET',
        'CHROME_REFRESH_TOKEN',
    ],
    edge: ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'],
    firefox: ['FIREFOX_AMO_ID', 'FIREFOX_CLIENT_ID', 'FIREFOX_CLIENT_SECRET'],
};

/**
 * Deployment modes each store workflow offers. `submit` is the default everywhere; `validate`
 * resolves and verifies the release without touching the store; Edge `upload` only fills the
 * draft and Firefox `status` only reports the review state.
 */
const STORE_MODES: Record<string, string[]> = {
    chrome: ['submit', 'validate'],
    edge: ['submit', 'upload', 'validate'],
    firefox: ['submit', 'status', 'validate'],
};

const DEFAULT_MODE = 'submit';

const CHECKSUMS_FILE = 'SHA256SUMS.txt';

/**
 * Narrows the raw STORE_TARGET value to a store this repository deploys to.
 *
 * @param value Raw environment value.
 *
 * @returns Whether the value names a configured store target.
 */
const isStoreTarget = (value: string | undefined): value is StoreTarget => {
    return (STORE_TARGETS as readonly string[]).includes(value ?? '');
};

/**
 * Prepare store assets and GitHub outputs without executing code from the release tag.
 *
 * @param env Deployment configuration; credential values are never logged.
 *
 * @throws If release context, configuration, ancestry or assets cannot be verified.
 */
export const prepare = (env: NodeJS.ProcessEnv = process.env): void => {
    const browser = env.STORE_TARGET;
    const mode = env.DEPLOY_MODE || DEFAULT_MODE;
    if (!isStoreTarget(browser) || !STORE_MODES[browser]?.includes(mode)) {
        throw new Error('Invalid store target or deployment mode');
    }
    // Widened on purpose: repositories with a single store target would otherwise fail to
    // type-check the Firefox-specific branches below.
    const store: string = browser;
    requireConfiguration(['GITHUB_REPOSITORY', 'GITHUB_OUTPUT', 'GH_TOKEN'], env);
    const repository = env.GITHUB_REPOSITORY ?? '';
    const output = env.GITHUB_OUTPUT ?? '';
    const tag = env.INPUT_TAG?.trim();
    if (tag && !RELEASE_TAG_PATTERN.test(tag)) {
        throw new Error('Release tag must match vX.Y.Z');
    }
    const viewArgs = [
        'release', 'view', ...(tag ? [tag] : []),
        '--repo', repository, '--json', 'tagName,isDraft,isPrerelease',
    ];
    const releaseJson = execFileSync('gh', viewArgs, { encoding: 'utf8' });
    const release = JSON.parse(releaseJson) as PublishedRelease;
    const version = releaseVersion(release);
    requireConfiguration(STORE_CONFIGURATION[browser] ?? [], env);
    execFileSync('git', ['fetch', '--no-tags', 'origin', 'master']);
    const revParse = ['rev-parse', 'FETCH_HEAD^{commit}'];
    const master = execFileSync('git', revParse, { encoding: 'utf8' }).trim();
    execFileSync('git', ['fetch', '--no-tags', 'origin', `refs/tags/${release.tagName}`]);
    const tagCommit = execFileSync('git', revParse, { encoding: 'utf8' }).trim();
    execFileSync('git', ['merge-base', '--is-ancestor', tagCommit, master]);
    const pkg = JSON.parse(execFileSync('git', ['show', `${tagCommit}:package.json`], {
        encoding: 'utf8',
    })) as { version?: unknown };
    if (pkg.version !== version) {
        throw new Error('Tagged package.json version does not match release tag');
    }
    mkdirSync(STORE_UPLOAD_DIRECTORY, { recursive: true });
    const archive = `${RELEASE_ASSET_PREFIX}-${version}-${browser}.zip`;
    const source = `${RELEASE_ASSET_PREFIX}-${version}-source.zip`;
    const assets = [archive, ...(store === 'firefox' ? [source] : [])];
    const patterns = [...assets, CHECKSUMS_FILE].flatMap((name) => ['--pattern', name]);
    execFileSync('gh', [
        'release', 'download', release.tagName,
        '--repo', repository, '--dir', STORE_UPLOAD_DIRECTORY, ...patterns,
    ]);
    const checksums = readFileSync(path.join(STORE_UPLOAD_DIRECTORY, CHECKSUMS_FILE), 'utf8');
    assets.forEach((asset) => {
        verifyChecksum(asset, readFileSync(path.join(STORE_UPLOAD_DIRECTORY, asset)), checksums);
    });
    verifyManifest(readFileSync(path.join(STORE_UPLOAD_DIRECTORY, archive)), version, browser);
    if (store === 'firefox') {
        const sourceBytes = readFileSync(path.join(STORE_UPLOAD_DIRECTORY, source));
        const notes = verifySource(sourceBytes, version, false);
        writeFileSync(path.join(STORE_UPLOAD_DIRECTORY, AMO_APPROVAL_NOTES_FILENAME), notes);
    }
    appendFileSync(
        output,
        `tag=${release.tagName}\nversion=${version}\nasset=${archive}\nsource=${source}\n`,
    );
    process.stdout.write(
        `Verified ${release.tagName} (${tagCommit}) for ${browser} in ${mode} mode: `
        + `${assets.join(', ')}\n`,
    );
};

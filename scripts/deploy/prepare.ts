/**
 * @file Resolve one published release and verify its immutable store upload inputs.
 * Repository specifics live in ./constants.
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
    AMO_APPROVAL_NOTES_SUMMARY,
    AMO_REVIEW_NOTES_PATH,
    RELEASE_ASSET_PREFIX,
    RELEASE_TAG_PATTERN,
    Store,
    STORE_TARGETS,
    STORE_UPLOAD_DIRECTORY,
} from './constants';
import {
    releaseVersion,
    requireConfiguration,
    verifyAmoNotes,
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
    [Store.Chrome]: [
        'CHROME_APP_ID',
        'CHROME_PUBLISHER_ID',
        'CHROME_CLIENT_ID',
        'CHROME_CLIENT_SECRET',
        'CHROME_REFRESH_TOKEN',
    ],
    [Store.Edge]: ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_API_KEY'],
    [Store.Firefox]: ['FIREFOX_AMO_ID', 'FIREFOX_CLIENT_ID', 'FIREFOX_CLIENT_SECRET'],
};

/**
 * Deployment modes of the store workflows. `Submit` is the default everywhere; `Validate`
 * resolves and verifies the release without touching the store; Edge `Upload` only fills the
 * draft and Firefox `Status` only reports the review state.
 */
export const DeployMode = {
    Submit: 'submit',
    Upload: 'upload',
    Status: 'status',
    Validate: 'validate',
} as const;

/**
 * Deployment modes each store workflow offers.
 */
const STORE_MODES: Record<string, string[]> = {
    [Store.Chrome]: [DeployMode.Submit, DeployMode.Validate],
    [Store.Edge]: [DeployMode.Submit, DeployMode.Upload, DeployMode.Validate],
    [Store.Firefox]: [DeployMode.Submit, DeployMode.Status, DeployMode.Validate],
};

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
 * Build the approval notes sent to AMO: a short summary and a link to the full reviewer
 * instructions pinned to the release tag, so the notes fit the limit however long those grow.
 *
 * @param repository GitHub repository holding the release, as `owner/name`.
 * @param tag Release tag.
 *
 * @returns Approval notes for the release.
 */
const approvalNotes = (repository: string, tag: string): string => [
    AMO_APPROVAL_NOTES_SUMMARY,
    '',
    `Build and test instructions: https://github.com/${repository}/blob/${tag}/${AMO_REVIEW_NOTES_PATH}`,
    `The same file is ${AMO_REVIEW_NOTES_PATH} in the attached source ZIP.`,
].join('\n');

/**
 * Prepare store assets and GitHub outputs without executing code from the release tag.
 *
 * @param env Deployment configuration; credential values are never logged.
 *
 * @throws If release context, configuration, ancestry or assets cannot be verified.
 */
export const prepare = (env: NodeJS.ProcessEnv = process.env): void => {
    const browser = env.STORE_TARGET;
    const mode = env.DEPLOY_MODE || DeployMode.Submit;
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
    const assets = [archive, ...(store === Store.Firefox ? [source] : [])];
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
    if (store === Store.Firefox) {
        const sourceBytes = readFileSync(path.join(STORE_UPLOAD_DIRECTORY, source));
        const instructions = verifySource(sourceBytes, version, false);
        // Empty notes mark a release source without reviewer instructions; preflight refuses to
        // submit a new version with them.
        const notes = instructions.trim() ? approvalNotes(repository, release.tagName) : '';
        // `status` only reads AMO, so it must not depend on notes that are never sent.
        if (mode !== DeployMode.Status) {
            verifyAmoNotes(notes);
        }
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

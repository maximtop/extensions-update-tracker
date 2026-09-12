/**
 * @file Read-only Firefox deployment preflight and post-submit/status reporting.
 * Shared deployment contract for extension repositories; repository specifics live in
 * ./constants.
 */

import {
    appendFileSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    AMO_APPROVAL_NOTES_FILENAME,
    GECKO_ID,
    RELEASE_TAG_PATTERN,
    STORE_UPLOAD_DIRECTORY,
} from './constants';
import {
    AMO_REQUEST_TIMEOUT_MS,
    AMO_STATUS,
    amoToken,
    describeAmoStatus,
    readAmo,
    shouldSubmit,
    verifySignedXpi,
} from './firefox';
import { requireConfiguration } from './release';

import type { AmoAddon, AmoVersion } from './firefox';

const HUB_URL = 'https://addons.mozilla.org/en-US/developers/addon/';

/**
 * Supported AMO_OPERATION values; omitted configuration defaults to status reporting.
 */
export const AMO_OPERATION = {
    Preflight: 'preflight',
    Status: 'status',
} as const;

/**
 * Check exact-version state, without ever submitting a second copy.
 *
 * @param env Deployment configuration without logging credential values.
 *
 * @throws If identity cannot be established or a signed package fails verification.
 */
export const run = async (env: NodeJS.ProcessEnv = process.env): Promise<void> => {
    requireConfiguration(
        ['FIREFOX_CLIENT_ID', 'FIREFOX_CLIENT_SECRET', 'FIREFOX_AMO_ID', 'VERSION'],
        env,
    );
    const version = env.VERSION ?? '';
    const listing = env.FIREFOX_AMO_ID ?? '';
    if (!RELEASE_TAG_PATTERN.test(`v${version}`)) {
        throw new Error('Invalid version');
    }
    const operation = env.AMO_OPERATION ?? AMO_OPERATION.Status;
    if (!Object.values(AMO_OPERATION).some((supported) => supported === operation)) {
        const expected = Object.values(AMO_OPERATION).join(' or ');
        throw new Error(`Invalid AMO_OPERATION; expected ${expected}`);
    }
    const token = amoToken(env.FIREFOX_CLIENT_ID ?? '', env.FIREFOX_CLIENT_SECRET ?? '');
    const addon = await readAmo<AmoAddon>(listing, '', token);
    if (!addon || addon.guid !== GECKO_ID || addon.is_disabled) {
        throw new Error('AMO listing missing, disabled, or Gecko ID mismatch');
    }
    const result = await readAmo<AmoVersion>(listing, `versions/${version}/`, token);
    if (result && (result.version !== version || result.channel !== 'listed')) {
        throw new Error('AMO returned a different version or channel');
    }
    if (operation === AMO_OPERATION.Preflight) {
        const submit = shouldSubmit(result);
        const notesPath = path.join(STORE_UPLOAD_DIRECTORY, AMO_APPROVAL_NOTES_FILENAME);
        if (submit && !readFileSync(notesPath, 'utf8').trim()) {
            throw new Error('New submissions require docs/AMO_REVIEW.md in the release source ZIP');
        }
        if (env.GITHUB_OUTPUT) {
            appendFileSync(env.GITHUB_OUTPUT, `submit=${submit}\n`);
        }
        process.stdout.write(result
            ? 'Version already exists; upload skipped\n'
            : 'Version absent; safe to submit once\n');
        return;
    }
    const status = describeAmoStatus(addon, result);
    const hub = `${HUB_URL}${encodeURIComponent(addon.slug)}/versions`;
    const report = `## Firefox AMO — v${version}\n\n- ${status}\n- [Developer Hub](${hub})\n`
        + '- Firefox publishes automatically after approval. '
        + 'GitHub Release creation never submits a version.\n';
    process.stdout.write(`${status}\n`);
    if (env.GITHUB_STEP_SUMMARY) {
        appendFileSync(env.GITHUB_STEP_SUMMARY, report);
    }
    if (result?.file.status !== AMO_STATUS.Public || result.is_disabled) {
        return;
    }
    if (!result.file.url || !result.file.hash) {
        throw new Error(
            'Approved version has no downloadable signed artifact/hash yet; run status again later',
        );
    }
    const url = new URL(result.file.url);
    if (url.protocol !== 'https:' || url.hostname !== 'addons.mozilla.org') {
        throw new Error('Unexpected AMO download URL');
    }
    // Public signed downloads do not need credentials. Never forward the JWT to a CDN.
    const response = await fetch(url, { signal: AbortSignal.timeout(AMO_REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
        throw new Error(`Signed artifact download failed: HTTP ${response.status}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    verifySignedXpi(bytes, result.file.hash, version);
    const output = path.join(STORE_UPLOAD_DIRECTORY, 'signed');
    mkdirSync(output, { recursive: true });
    writeFileSync(path.join(output, `firefox-${version}.xpi`), bytes);
    const checksum = `${result.file.hash.slice('sha256:'.length)}  firefox-${version}.xpi\n`;
    writeFileSync(path.join(output, 'SHA256SUMS.txt'), checksum);
    if (env.GITHUB_OUTPUT) {
        appendFileSync(env.GITHUB_OUTPUT, 'signed=true\n');
    }
    if (env.GITHUB_STEP_SUMMARY) {
        appendFileSync(
            env.GITHUB_STEP_SUMMARY,
            '- Signed XPI verified against AMO SHA-256, version and Gecko ID.\n',
        );
    }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    run().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'AMO status check failed';
        process.stderr.write(`${message}\n`);
        if (process.env.GITHUB_STEP_SUMMARY) {
            appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nAMO check failed: ${message}\n`);
        }
        process.exitCode = 1;
    });
}

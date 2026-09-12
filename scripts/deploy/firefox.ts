/**
 * @file Minimal read-only AMO client for duplicate prevention and signed artifact verification.
 * Shared deployment contract for extension repositories; repository specifics live in
 * ./constants.
 */

import { createHash, createHmac, randomUUID } from 'node:crypto';

import AdmZip from 'adm-zip';

import { verifyManifest } from './release';

/**
 * Root of the AMO add-on API; the listing identifier and the version path follow.
 */
export const AMO_API_URL = 'https://addons.mozilla.org/api/v5/addons/addon/';

/**
 * Time budget of one AMO request or signed artifact download.
 */
export const AMO_REQUEST_TIMEOUT_MS = 30000;

const AMO_JWT_LIFETIME_SECONDS = 60;

const MILLISECONDS_PER_SECOND = 1000;

/**
 * AMO states understood by status reporting and signed artifact checks. Unknown API states
 * remain valid input and are reported conservatively.
 */
export const AMO_STATUS = {
    Public: 'public',
    Disabled: 'disabled',
    Unreviewed: 'unreviewed',
} as const;

/**
 * Review state and signed artifact fields returned for one AMO file.
 */
export type AmoFile = {
    /**
     * Review state of the file.
     */
    status: string;

    /**
     * Download URL after AMO signs the file.
     */
    url?: string;

    /**
     * Content hash supplied for the signed file.
     */
    hash?: string;
};

/**
 * Public version summary embedded in an AMO add-on response.
 */
export type AmoCurrentVersion = {
    /**
     * Public version string.
     */
    version: string;
};

/**
 * Optional disabled state returned under AMO's snake-case API field.
 */
type AmoDisabledState = Partial<Record<'is_disabled', boolean>>;

/**
 * Optional public-version fields returned under AMO's snake-case API names.
 */
type AmoPublicVersionState = Partial<Record<'current_version', AmoCurrentVersion | null>>;

/**
 * AMO fields needed to distinguish review, approval, signing and publication.
 */
export type AmoVersion = AmoDisabledState & {
    /**
     * Numeric AMO version identifier.
     */
    id: number;

    /**
     * Version string as submitted.
     */
    version: string;

    /**
     * Distribution channel, `listed` for store versions.
     */
    channel: string;

    /**
     * URL of the attached source archive, absent when none was uploaded.
     */
    source?: string | null;

    /**
     * Review state of the file and, once signed, its download URL and hash.
     */
    file: AmoFile;
};

/**
 * Add-on identity and current publicly listed version.
 */
export type AmoAddon = AmoDisabledState & AmoPublicVersionState & {
    /**
     * Extension ID (`browser_specific_settings.gecko.id`).
     */
    guid: string;

    /**
     * Listing slug used in Developer Hub URLs.
     */
    slug: string;

    /**
     * Listing status, `public` once approved.
     */
    status: string;

};

/**
 * Build a short-lived AMO JWT without adding a runtime dependency.
 *
 * @param issuer API issuer from GitHub Secrets.
 * @param secret API secret from GitHub Secrets.
 *
 * @returns Signed JWT accepted by the AMO API for the next minute.
 *
 * @throws If the supplied value is the masked secret shown by AMO.
 */
export const amoToken = (issuer: string, secret: string): string => {
    if (secret.includes('...')) {
        throw new Error(
            'AMO secret is masked; use the full original JWT secret, '
            + 'not the displayed value with dots',
        );
    }
    const now = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: issuer, jti: randomUUID(), iat: now, exp: now + AMO_JWT_LIFETIME_SECONDS,
    })).toString('base64url');
    const message = `${header}.${payload}`;
    return `${message}.${createHmac('sha256', secret).update(message).digest('base64url')}`;
};

/**
 * Read one AMO entity. Only an actual 404 represents absence.
 *
 * @param id AMO listing identifier.
 * @param suffix Relative version endpoint, or empty for the add-on.
 * @param token Short-lived bearer token.
 * @param request Injectable transport for behavioral tests.
 *
 * @returns The parsed entity, or null when AMO answered 404.
 *
 * @throws If AMO cannot confirm the state.
 */
export const readAmo = async <T>(
    id: string,
    suffix: string,
    token: string,
    request = fetch,
): Promise<T | null> => {
    const response = await request(`${AMO_API_URL}${encodeURIComponent(id)}/${suffix}`, {
        headers: { Authorization: `JWT ${token}` },
        signal: AbortSignal.timeout(AMO_REQUEST_TIMEOUT_MS),
        redirect: 'error',
    });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        const body = await response.json().catch((): null => null) as { detail?: unknown } | null;
        const detail = typeof body?.detail === 'string' ? body.detail : '';
        // Report only known authentication diagnostics, never arbitrary response values or
        // credentials.
        const diagnostics = [
            'expired', 'not yet valid', 'signature', 'issuer', 'credentials', 'authentication',
        ];
        const reason = diagnostics.filter((word) => detail.toLowerCase().includes(word)).join(', ');
        const suffixText = reason ? ` (${reason})` : '';
        throw new Error(`AMO status request failed: HTTP ${response.status}${suffixText}`);
    }
    return response.json() as Promise<T>;
};

/**
 * Give a conservative status for the exact requested version.
 *
 * @param addon Current listing state.
 * @param version Version state, including private pending versions.
 *
 * @returns One-line status for the job summary.
 */
export const describeAmoStatus = (addon: AmoAddon, version: AmoVersion | null): string => {
    if (!version) {
        return 'Version not submitted';
    }
    if (version.is_disabled || addon.is_disabled || version.file.status === AMO_STATUS.Disabled) {
        return 'Disabled, rejected or unavailable; inspect Developer Hub';
    }
    if (version.file.status === AMO_STATUS.Unreviewed) {
        return 'Submitted; awaiting Mozilla review and signing';
    }
    if (version.file.status === AMO_STATUS.Public) {
        const isCurrent = addon.current_version?.version === version.version;
        return addon.status === AMO_STATUS.Public && isCurrent
            ? 'Approved and published on AMO'
            : 'Approved; not the current publicly listed version';
    }
    return `AMO file status: ${version.file.status}; inspect Developer Hub`;
};

/**
 * Verify AMO's signed XPI hash, manifest identity and signature envelope.
 *
 * @param bytes Downloaded signed package.
 * @param hash SHA-256 supplied by the authenticated AMO version response.
 * @param version Requested version.
 *
 * @throws If integrity, identity or signing evidence is missing.
 */
export const verifySignedXpi = (bytes: Buffer, hash: string, version: string): void => {
    const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (!/^sha256:[a-f0-9]{64}$/.test(hash) || digest !== hash) {
        throw new Error('Signed XPI hash does not match AMO');
    }
    verifyManifest(bytes, version, 'firefox');
    const zip = new AdmZip(bytes);
    const signed = zip.getEntries()
        .some((entry) => /^META-INF\/(?:mozilla\.rsa|cose\.sig)$/i.test(entry.entryName));
    if (!signed) {
        throw new Error('AMO artifact has no Mozilla signature envelope');
    }
};

/**
 * Decide whether an upload is needed; reject incomplete existing submissions.
 *
 * @param version Existing AMO version, or null if confirmed absent.
 *
 * @returns Whether the version is absent and can be submitted once.
 *
 * @throws If an existing version needs manual source recovery.
 */
export const shouldSubmit = (version: AmoVersion | null): boolean => {
    if (version && !version.source) {
        throw new Error(
            'Version already exists without source; attach matching source in Developer Hub',
        );
    }
    return version === null;
};

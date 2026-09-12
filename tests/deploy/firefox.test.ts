// @vitest-environment node

/**
 * @file Shared AMO state and signed artifact behavior with simulated network responses.
 */

import { createHash, createHmac } from 'node:crypto';

import AdmZip from 'adm-zip';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import { GECKO_ID } from '../../scripts/deploy/constants';
import {
    AMO_STATUS,
    amoToken,
    describeAmoStatus,
    readAmo,
    shouldSubmit,
    verifySignedXpi,
} from '../../scripts/deploy/firefox';

import type { AmoAddon, AmoVersion } from '../../scripts/deploy/firefox';

const addon: AmoAddon = {
    guid: 'fixture@test',
    slug: 'fixture',
    status: AMO_STATUS.Public,
    current_version: { version: '1.2.3' },
};
const version: AmoVersion = {
    id: 123, version: '1.2.3', channel: 'listed', file: { status: AMO_STATUS.Unreviewed },
};
const firefoxManifest = JSON.stringify({
    manifest_version: 3,
    version: '1.2.3',
    browser_specific_settings: { gecko: { id: GECKO_ID } },
    background: { scripts: ['background.js'] },
});

describe('AMO read-only checks', () => {
    it('rejects the masked secret displayed by AMO without disclosing it', () => {
        expect(() => amoToken('issuer', 'prefix...suffix')).toThrow('AMO secret is masked');
    });
    it('reports authentication diagnostics without echoing response secrets', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
            detail: 'Signature has expired. Sensitive diagnostic: do-not-log-me',
        }), { status: 401 }));
        await expect(readAmo('fixture', '', 'jwt', request)).rejects.toThrow(
            /^AMO status request failed: HTTP 401 \(expired, signature\)$/,
        );
    });
    it('signs a short-lived JWT without exposing its secret', () => {
        const token = amoToken('issuer', 'private-secret');
        const [header = '', payload = '', signature = ''] = token.split('.');
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
            iss: string;
            iat: number;
            exp: number;
        };
        expect(data.iss).toBe('issuer');
        expect(data.exp).toBeGreaterThan(data.iat);
        expect(data.exp - data.iat).toBeLessThanOrEqual(300);
        const expected = createHmac('sha256', 'private-secret')
            .update(`${header}.${payload}`)
            .digest('base64url');
        expect(signature).toBe(expected);
    });
    it('treats only 404 as absent; auth and server failures prevent upload', async () => {
        const request = vi.fn<typeof fetch>();
        request.mockResolvedValueOnce(new Response(null, { status: 404 }));
        expect(await readAmo('fixture@test', 'versions/1.2.3/', 'jwt', request)).toBeNull();
        const statuses = [401, 403, 429, 500];
        statuses.forEach((status) => {
            request.mockResolvedValueOnce(new Response(null, { status }));
        });
        await Promise.all(statuses.map((status) => {
            return expect(readAmo('fixture@test', '', 'jwt', request)).rejects
                .toThrow(`HTTP ${String(status)}`);
        }));
        request.mockRejectedValueOnce(new Error('network unavailable'));
        await expect(readAmo('fixture@test', '', 'jwt', request)).rejects
            .toThrow('network unavailable');
    });
    it('reads existing private versions regardless of the categories shape', async () => {
        const request = vi.fn<typeof fetch>()
            .mockResolvedValue(new Response(JSON.stringify(version)));
        expect(await readAmo('fixture@test', 'versions/1.2.3/', 'jwt', request))
            .toEqual(version);
        expect(request.mock.calls[0]?.[0]).toContain('fixture%40test/versions/1.2.3/');
    });
    it('skips an existing complete version and stops incomplete ones before a duplicate', () => {
        expect(shouldSubmit(null)).toBe(true);
        expect(shouldSubmit({ ...version, source: 'https://example.test/source.zip' })).toBe(false);
        expect(() => shouldSubmit(version)).toThrow('already exists without source');
    });
    it('distinguishes pending, approved, published, absent and disabled states', () => {
        expect(describeAmoStatus(addon, null)).toContain('not submitted');
        expect(describeAmoStatus(addon, version)).toContain('awaiting');
        const approved = { ...version, file: { status: AMO_STATUS.Public } };
        expect(describeAmoStatus(addon, approved)).toContain('Approved and published');
        const unlisted: AmoAddon = { ...addon, current_version: null };
        expect(describeAmoStatus(unlisted, approved)).toContain('not the current');
        expect(describeAmoStatus(addon, { ...approved, is_disabled: true })).toContain('Disabled');
        expect(describeAmoStatus(addon, { ...version, file: { status: AMO_STATUS.Disabled } }))
            .toContain('Disabled');
        expect(describeAmoStatus(addon, { ...version, file: { status: 'future-api-state' } }))
            .toBe('AMO file status: future-api-state; inspect Developer Hub');
    });
    it('verifies signed artifact integrity and refuses unsigned or wrong-version payloads', () => {
        const zip = new AdmZip();
        zip.addFile('manifest.json', Buffer.from(firefoxManifest));
        const unsigned = zip.toBuffer();
        zip.addFile('META-INF/mozilla.rsa', Buffer.from('synthetic signature envelope'));
        const signed = zip.toBuffer();

        /**
         * Hash fixture bytes in the format returned by AMO.
         *
         * @param bytes Fixture package bytes.
         *
         * @returns SHA-256 label and hexadecimal digest.
         */
        const hash = (bytes: Buffer): string => {
            return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
        };
        expect(() => {
            verifySignedXpi(signed, hash(signed), '1.2.3');
        }).not.toThrow();
        expect(() => {
            verifySignedXpi(signed, hash(unsigned), '1.2.3');
        }).toThrow('hash');
        expect(() => {
            verifySignedXpi(unsigned, hash(unsigned), '1.2.3');
        }).toThrow('signature');
        expect(() => {
            verifySignedXpi(signed, hash(signed), '2.0.0');
        }).toThrow('version');
    });
});

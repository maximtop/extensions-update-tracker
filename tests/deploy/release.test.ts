// @vitest-environment node

/**
 * @file Store release validation against generated ZIP fixtures. Identical in every extension
 * repository; repository specifics come from scripts/deploy/constants.
 */

import { createHash } from 'node:crypto';

import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';

import {
    AMO_REVIEW_NOTES_PATH,
    GECKO_ID,
    RELEASE_TAG_PATTERN,
    SOURCE_REQUIRED_FILES,
} from '../../scripts/deploy/constants';
import {
    releaseVersion,
    requireConfiguration,
    verifyChecksum,
    verifyManifest,
    verifySource,
} from '../../scripts/deploy/release';

const pack = (files: Record<string, string>): Buffer => {
    const zip = new AdmZip();
    Object.entries(files).forEach(([name, value]) => {
        zip.addFile(name, Buffer.from(value));
    });
    return zip.toBuffer();
};
const chromiumManifest = JSON.stringify({
    manifest_version: 3,
    version: '1.2.3',
    background: { service_worker: 'background.js' },
});
const firefoxManifest = JSON.stringify({
    manifest_version: 3,
    version: '1.2.3',
    browser_specific_settings: { gecko: { id: GECKO_ID } },
    background: { scripts: ['background.js'] },
});
const firefoxManifestWithoutBackground = JSON.stringify({
    manifest_version: 3,
    version: '1.2.3',
    browser_specific_settings: { gecko: { id: GECKO_ID } },
});
const sourceFiles: Record<string, string> = Object.fromEntries(
    SOURCE_REQUIRED_FILES.map((file) => [file, 'fixture']),
);
sourceFiles['package.json'] = JSON.stringify({ version: '1.2.3' });
sourceFiles[AMO_REVIEW_NOTES_PATH] = 'Reviewer instructions for this release';

describe('published release contract', () => {
    it('accepts a stable release and rejects drafts, prereleases and malformed tags', () => {
        expect(RELEASE_TAG_PATTERN.test('v1.2.3')).toBe(true);
        expect(RELEASE_TAG_PATTERN.test('1.2.3')).toBe(false);
        const release = { tagName: 'v1.2.3', isDraft: false, isPrerelease: false };
        expect(releaseVersion(release)).toBe('1.2.3');
        const invalid = [
            { isDraft: true },
            { isPrerelease: true },
            { tagName: 'v1.2.3-rc.1' },
            { tagName: '-h' },
        ];
        invalid.forEach((change) => {
            expect(() => releaseVersion({ ...release, ...change })).toThrow();
        });
    });
    it('reports missing names without disclosing present credentials', () => {
        expect(() => {
            requireConfiguration(['KEY', 'SECRET'], { KEY: 'private' });
        })
            .toThrow('SECRET');
        expect(() => {
            requireConfiguration(['KEY'], { KEY: 'private' });
        }).not.toThrow();
    });
    it('requires one exact basename checksum and accepts the ./ prefix', () => {
        const bytes = Buffer.from('a real archive payload');
        const digest = createHash('sha256').update(bytes).digest('hex');
        const line = `${digest}  ./release.zip\n`;
        expect(() => {
            verifyChecksum('release.zip', bytes, line);
        }).not.toThrow();
        ['', line + line, line.replace('release.zip', 'old-release.zip')].forEach((sums) => {
            expect(() => {
                verifyChecksum('release.zip', bytes, sums);
            }).toThrow();
        });
        expect(() => {
            verifyChecksum('release.zip', Buffer.from('tampered'), line);
        }).toThrow();
    });
    it('accepts a Chromium package for Chromium stores, rejects wrong versions and targets', () => {
        const bytes = pack({ 'manifest.json': chromiumManifest });
        expect(() => {
            verifyManifest(bytes, '1.2.3', 'chrome');
        }).not.toThrow();
        expect(() => {
            verifyManifest(bytes, '1.2.3', 'edge');
        }).not.toThrow();
        expect(() => {
            verifyManifest(bytes, '2.0.0', 'chrome');
        }).toThrow('version');
        expect(() => {
            verifyManifest(bytes, '1.2.3', 'firefox');
        }).toThrow('Gecko');
        const firefox = pack({ 'manifest.json': firefoxManifest });
        expect(() => {
            verifyManifest(firefox, '1.2.3', 'chrome');
        }).toThrow('service worker');
        const nested = pack({ 'nested/manifest.json': chromiumManifest });
        expect(() => {
            verifyManifest(nested, '1.2.3', 'chrome');
        }).toThrow('exactly one');
    });
    it.runIf(GECKO_ID)(
        'accepts Firefox packages with the configured Gecko ID and valid background',
        () => {
            const bytes = pack({ 'manifest.json': firefoxManifest });
            expect(() => {
                verifyManifest(bytes, '1.2.3', 'firefox');
            }).not.toThrow();
            const withoutBackground = pack({
                'manifest.json': firefoxManifestWithoutBackground,
            });
            expect(() => {
                verifyManifest(withoutBackground, '1.2.3', 'firefox');
            }).not.toThrow();
            const other = pack({
                'manifest.json': firefoxManifest.replace(GECKO_ID, 'another-addon@example.test'),
            });
            expect(() => {
                verifyManifest(other, '1.2.3', 'firefox');
            }).toThrow('Gecko');
            const invalidBackground = firefoxManifest.replace(
                '["background.js"]',
                '"background.js"',
            );
            expect(() => {
                verifyManifest(pack({ 'manifest.json': invalidBackground }), '1.2.3', 'firefox');
            }).toThrow('background');
        },
    );
    it('requires matching source and notes for new submissions, permits historical checks', () => {
        expect(verifySource(pack(sourceFiles), '1.2.3', true)).toContain('Reviewer instructions');
        expect(() => {
            verifySource(pack(sourceFiles), '2.0.0', true);
        }).toThrow('version');
        const historical = Object.fromEntries(
            Object.entries(sourceFiles).filter(([file]) => file !== AMO_REVIEW_NOTES_PATH),
        );
        expect(() => {
            verifySource(pack(historical), '1.2.3', true);
        }).toThrow(AMO_REVIEW_NOTES_PATH);
        expect(() => {
            verifySource(pack(historical), '1.2.3', false);
        }).not.toThrow();
        const last = SOURCE_REQUIRED_FILES[SOURCE_REQUIRED_FILES.length - 1] ?? '';
        const incomplete = Object.fromEntries(
            Object.entries(sourceFiles).filter(([file]) => file !== last),
        );
        expect(() => {
            verifySource(pack(incomplete), '1.2.3', false);
        }).toThrow('missing');
    });
});

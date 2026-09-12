import { describe, expect, it } from 'vitest';

import { Browser } from '../../scripts/build/constants';
import { buildManifest, FIREFOX_GECKO_ID, FIREFOX_STRICT_MIN_VERSION } from '../../scripts/build/manifest';

const sourceManifest = {
    manifest_version: 3,
    version: '1.0.0',
    permissions: ['management', 'notifications', 'storage'],
    background: {
        service_worker: 'background.js',
        type: 'module',
    },
    incognito: 'split',
};

describe('buildManifest', () => {
    it.each([Browser.Chrome, Browser.Edge])('keeps the Chromium background for %s', (browser) => {
        expect(buildManifest(sourceManifest, browser, '1.3.1')).toMatchObject({
            version: '1.3.1',
            background: {
                service_worker: 'background.js',
                type: 'module',
            },
        });
    });

    it('creates an AMO-compatible Firefox manifest without changing permissions', () => {
        expect(buildManifest(sourceManifest, Browser.Firefox, '1.3.1')).toEqual({
            manifest_version: 3,
            version: '1.3.1',
            permissions: ['management', 'notifications', 'storage'],
            background: {
                scripts: ['background.js'],
            },
            browser_specific_settings: {
                gecko: {
                    id: FIREFOX_GECKO_ID,
                    strict_min_version: FIREFOX_STRICT_MIN_VERSION,
                    data_collection_permissions: {
                        required: ['none'],
                    },
                },
            },
        });
    });

    it('does not mutate the shared source manifest', () => {
        buildManifest(sourceManifest, Browser.Firefox, '1.3.1');

        expect(sourceManifest.background).toEqual({
            service_worker: 'background.js',
            type: 'module',
        });
    });
});

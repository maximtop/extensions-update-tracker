import { Browser } from './constants';

/**
 * Permanent Firefox extension identifier used by AMO.
 */
export const FIREFOX_GECKO_ID = 'extensions-update-tracker@maximtop.dev';

/**
 * Oldest Firefox release supported by the AMO package.
 */
export const FIREFOX_STRICT_MIN_VERSION = '140.0';

type ExtensionManifest = Record<string, unknown> & {
    background?: {
        service_worker?: string;
        [key: string]: unknown;
    };
    incognito?: string;
};

/**
 * Builds a browser-specific manifest from the shared Chromium-shaped source.
 *
 * @param sourceManifest Parsed source manifest.
 * @param browser Browser package being built.
 * @param version Package version to stamp into the manifest.
 *
 * @returns A browser-specific manifest object.
 */
export const buildManifest = (
    sourceManifest: Record<string, unknown>,
    browser: Browser,
    version: string,
): Record<string, unknown> => {
    const manifest = structuredClone(sourceManifest) as ExtensionManifest;
    manifest.version = version;

    if (browser === Browser.Firefox) {
        const serviceWorker = manifest.background?.service_worker;
        if (typeof serviceWorker !== 'string') {
            throw new Error('The source manifest must declare background.service_worker');
        }

        manifest.background = {
            scripts: [serviceWorker],
        };
        delete manifest.incognito;
        manifest.browser_specific_settings = {
            gecko: {
                id: FIREFOX_GECKO_ID,
                strict_min_version: FIREFOX_STRICT_MIN_VERSION,
                data_collection_permissions: {
                    required: ['none'],
                },
            },
        };
    }

    return manifest;
};

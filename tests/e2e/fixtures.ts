import path from 'path';

import {
    test as base,
    chromium,
    type BrowserContext,
    type Worker,
} from '@playwright/test';

import { getSampleExtensionPath } from './helpers';

const currentDir = import.meta.dirname;

/**
 * How long to wait for the tracker's own service worker to register. Chromium
 * registers the loaded extensions' workers independently, so ours may not be the
 * first one to appear.
 */
const SERVICE_WORKER_TIMEOUT_MS = 15000;

/**
 * Returns true when the fetched manifest text belongs to this extension.
 *
 * The built manifest sets `"name": "__MSG_name__"` because the display name is
 * localized, so matching on the human-readable name can never succeed.
 * `homepage_url` is the only stable identifying field that survives the build.
 *
 * @param manifestText The manifest.json contents fetched from the extension's page.
 */
const isTrackerManifest = (manifestText: string): boolean => {
    try {
        const manifest = JSON.parse(manifestText);
        return Boolean(manifest.homepage_url?.includes('extensions-update-tracker'));
    } catch {
        return false;
    }
};

/**
 * Finds the tracker's service worker among all loaded extensions.
 *
 * Throws rather than falling back to an arbitrary worker: the sample extension
 * registers a worker too, so a silent fallback would run the whole suite against
 * the wrong extension and still report success.
 *
 * @param context The Playwright browser context both extensions are loaded into.
 */
const findTrackerServiceWorker = async (context: BrowserContext): Promise<Worker> => {
    const deadline = Date.now() + SERVICE_WORKER_TIMEOUT_MS;

    while (Date.now() < deadline) {
        for (const serviceWorker of context.serviceWorkers()) {
            const extensionId = serviceWorker.url().split('/')[2];
            const page = await context.newPage();
            try {
                await page.goto(`chrome-extension://${extensionId}/manifest.json`);
                const manifestText = await page.textContent('body');
                if (manifestText && isTrackerManifest(manifestText)) {
                    return serviceWorker;
                }
            } catch {
                // A worker may still be starting up; retry on the next pass
            } finally {
                await page.close();
            }
        }

        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
    }

    throw new Error(
        'Could not find the Extensions Update Tracker service worker. '
        + 'Is dist/test/chrome built? Run `pnpm build:test` first.',
    );
};

export const test = base.extend<{
    context: BrowserContext;
    extensionId: string;
    serviceWorker: Worker;
}>({
    // `headless` is Playwright's own option, so `--headed` and the config still
    // control it even though the context is launched by hand here.
    context: async ({ headless }, provide) => {
        const pathToExtension = path.join(currentDir, '../../dist/test/chrome');
        const sampleExtensionPath = getSampleExtensionPath();

        const context = await chromium.launchPersistentContext('', {
            // `channel: 'chromium'` selects the full Chromium build, whose new
            // headless mode supports extensions. The old headless mode did not,
            // and the default headless-shell binary still does not — so this
            // channel is what makes a headless run possible at all.
            channel: 'chromium',
            headless,
            args: [
                // Load both our extension and the sample extension
                `--disable-extensions-except=${pathToExtension},${sampleExtensionPath}`,
                `--load-extension=${pathToExtension},${sampleExtensionPath}`,
                '--no-sandbox',
            ],
        });
        await provide(context);
        await context.close();
    },
    // For Manifest V3: our background logic lives in a service worker, and the
    // sample extension registers one too, so it has to be identified explicitly.
    serviceWorker: async ({ context }, provide) => {
        const ourServiceWorker = await findTrackerServiceWorker(context);
        await provide(ourServiceWorker);
    },
    extensionId: async ({ serviceWorker }, provide) => {
        const urlParts = serviceWorker.url().split('/');
        const [, , extensionId] = urlParts;
        if (!extensionId) {
            throw new Error(`Could not parse extension ID from service worker URL: ${serviceWorker.url()}`);
        }
        await provide(extensionId);
    },
});

export const { expect } = test;

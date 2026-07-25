import path from 'path';
import { fileURLToPath } from 'url';

import {
    test as base,
    chromium,
    type BrowserContext,
    type Worker,
} from '@playwright/test';

import { getSampleExtensionPath } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    context: async ({ headless }, use) => {
        const pathToExtension = path.join(__dirname, '../../dist/test/chrome');
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
        await use(context);
        await context.close();
    },
    // For Manifest V3: our background logic lives in a service worker, and the
    // sample extension registers one too, so it has to be identified explicitly.
    serviceWorker: async ({ context }, use) => {
        const ourServiceWorker = await findTrackerServiceWorker(context);
        await use(ourServiceWorker);
    },
    extensionId: async ({ serviceWorker }, use) => {
        const urlParts = serviceWorker.url().split('/');
        const [, , extensionId] = urlParts;
        await use(extensionId);
    },
});

// eslint-disable-next-line prefer-destructuring
export const expect = test.expect;

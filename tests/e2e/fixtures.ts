import path from 'path';
import { fileURLToPath } from 'url';

import { test as base, chromium, type BrowserContext } from '@playwright/test';

import { getSampleExtensionPath } from './helpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const test = base.extend<{
    context: BrowserContext;
    extensionId: string;
}>({
    // eslint-disable-next-line no-empty-pattern
    context: async ({ }, use) => {
        const pathToExtension = path.join(__dirname, '../../dist/test/chrome');
        const sampleExtensionPath = getSampleExtensionPath();

        const context = await chromium.launchPersistentContext('', {
            channel: 'chromium',
            headless: false, // Extensions don't work well in headless
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
    extensionId: async ({ context }, use) => {
        // For Manifest V3: get extension ID from service worker
        // We need to find OUR extension's service worker, not the sample extension's
        let serviceWorkers = context.serviceWorkers();
        if (serviceWorkers.length === 0) {
            await context.waitForEvent('serviceworker');
            serviceWorkers = context.serviceWorkers();
        }

        // Find the Extensions Update Tracker service worker by checking the manifest
        let ourServiceWorker = null;
        for (const sw of serviceWorkers) {
            const swExtensionId = sw.url().split('/')[2];
            // Try to fetch the manifest to check the extension name
            try {
                const page = await context.newPage();
                await page.goto(`chrome-extension://${swExtensionId}/manifest.json`);
                const manifestText = await page.textContent('body');
                if (manifestText?.includes('Extensions Update Tracker')) {
                    ourServiceWorker = sw;
                    await page.close();
                    break;
                }
                await page.close();
            } catch {
                // Skip if can't read manifest
            }
        }

        const urlParts = (ourServiceWorker || serviceWorkers[0]).url().split('/');
        const [, , extensionId] = urlParts;
        await use(extensionId);
    },
});

// eslint-disable-next-line prefer-destructuring
export const expect = test.expect;

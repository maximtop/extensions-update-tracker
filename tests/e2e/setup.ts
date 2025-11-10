import path from 'path';

import type { BrowserContext, Page } from '@playwright/test';

/**
 * Get the path to the built extension
 */
export function getExtensionPath(): string {
    return path.join(process.cwd(), 'dist');
}

/**
 * Get extension ID from chrome://extensions page
 * Works with Manifest V3 service workers
 */
export async function getExtensionId(context: BrowserContext): Promise<string> {
    const extensionsPage = await context.newPage();
    await extensionsPage.goto('chrome://extensions');
    await extensionsPage.waitForTimeout(1000);

    const extensionId = await extensionsPage.evaluate(() => {
        const manager = document.querySelector('extensions-manager');
        const items = manager?.shadowRoot?.querySelectorAll('extensions-item');
        if (items) {
            for (const item of items) {
                const nameEl = item.shadowRoot?.querySelector('#name');
                if (nameEl?.textContent?.includes('Extensions Update Tracker')) {
                    return item.getAttribute('id');
                }
            }
        }
        return null;
    });

    await extensionsPage.close();

    if (!extensionId) {
        throw new Error('Extension ID not found - make sure extension is loaded');
    }

    return extensionId;
}

/**
 * Get extension URLs
 */
export function getExtensionUrls(extensionId: string) {
    return {
        options: `chrome-extension://${extensionId}/options.html`,
        popup: `chrome-extension://${extensionId}/popup.html`,
        background: `chrome-extension://${extensionId}/background.js`,
    };
}

/**
 * Setup console monitoring for a page
 */
export function setupConsoleErrorDetection(page: Page) {
    const errors: string[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
    });

    page.on('pageerror', (error: Error) => {
        errors.push(error.message);
    });

    return {
        getErrors: () => errors,
        hasErrors: () => errors.length > 0,
    };
}

/**
 * Setup console message collection (all types)
 */
export function setupConsoleMonitoring(page: Page) {
    const messages: string[] = [];

    page.on('console', (msg) => {
        const text = msg.text();
        messages.push(text);
    });

    return {
        getMessages: () => messages,
        clear: () => {
            messages.length = 0;
        },
    };
}

import { test, expect } from './fixtures';
import { setupConsoleErrorDetection } from './setup';

/**
 * Test 1: Install extension and verify no console errors
 * Checks that the extension loads without errors in:
 * - Options page
 * - Popup page
 */
test.describe('Basic Extension Functionality', () => {
    test('should install extension and load all pages without errors', async ({ context, extensionId }) => {
        console.log(`Extension ID: ${extensionId}`);
        expect(extensionId).toBeTruthy();

        // Open options page
        const optionsPage = await context.newPage();
        const optionsErrorDetector = setupConsoleErrorDetection(optionsPage);

        await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
        await optionsPage.waitForLoadState('networkidle');
        await optionsPage.waitForTimeout(1000);

        // Check options page has no errors
        expect(optionsErrorDetector.hasErrors()).toBe(false);
        if (optionsErrorDetector.hasErrors()) {
            console.error('Options page errors:', optionsErrorDetector.getErrors());
        }

        // Verify options page loaded correctly
        const optionsTitle = await optionsPage.title();
        expect(optionsTitle).toBeTruthy();

        // Check that main content is visible
        const header = await optionsPage.locator('h1').first();
        await expect(header).toBeVisible();

        // Open popup page
        const popupPage = await context.newPage();
        const popupErrorDetector = setupConsoleErrorDetection(popupPage);

        await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
        await popupPage.waitForLoadState('networkidle');
        await popupPage.waitForTimeout(1000);

        // Check popup page has no errors
        expect(popupErrorDetector.hasErrors()).toBe(false);
        if (popupErrorDetector.hasErrors()) {
            console.error('Popup page errors:', popupErrorDetector.getErrors());
        }

        // Verify popup page loaded correctly by checking for root element
        const popupRoot = await popupPage.locator('#root');
        await expect(popupRoot).toBeAttached();

        console.log('✓ All pages loaded without errors');
    });
});

import { test, expect } from './fixtures';
import { waitForUpdatesToBeTracked } from './helpers';

/**
 * Test 2: Mark all as read functionality
 * Verifies that:
 * 1. Clicking "Mark All as Read" button works
 * 2. UI updates to show 0 unread updates
 * 3. "New" badges are removed
 *
 * Note: The extension tracks itself and the sample extension on first load,
 * so there should always be updates to test with.
 */
test.describe('Mark All as Read Functionality', () => {
    test('should mark all updates as read and update UI', async ({ context, extensionId }) => {
        console.log(`Extension ID: ${extensionId}`);

        // Wait longer for the extension to detect and track installed extensions
        // The background service worker needs time to detect and save extension info
        await waitForUpdatesToBeTracked(5000);

        // Open options page
        const optionsPage = await context.newPage();
        await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
        await optionsPage.waitForLoadState('networkidle');

        // Wait for content to load and extensions to be tracked
        await optionsPage.waitForTimeout(3000);

        // Wait for updates to be tracked and displayed
        const unreadBadge = await optionsPage.getByTestId('unread-updates-count');
        await expect(unreadBadge).toBeVisible({ timeout: 15000 });

        const initialUnreadText = await unreadBadge.textContent();
        const initialUnreadCount = parseInt(initialUnreadText || '0', 10);

        console.log(`Initial unread count: ${initialUnreadCount}`);

        // Should have at least 2 updates (our extension + sample extension)
        expect(initialUnreadCount).toBeGreaterThanOrEqual(2);

        // Click "Mark All as Read" button
        const markAllButton = await optionsPage.getByTestId('mark-all-read-button');
        await expect(markAllButton).toBeVisible();
        await markAllButton.click();

        // Wait for the action to complete
        await optionsPage.waitForTimeout(2000);

        // Verify the unread count is now 0
        const updatedUnreadBadge = await optionsPage.getByTestId('unread-updates-count');
        const updatedUnreadText = await updatedUnreadBadge.textContent();
        const updatedUnreadCount = parseInt(updatedUnreadText || '0', 10);

        console.log(`Updated unread count: ${updatedUnreadCount}`);
        expect(updatedUnreadCount).toBe(0);

        // Verify that items no longer have "New" badges
        const newBadges = await optionsPage.locator('.badge:has-text("New")').count();
        expect(newBadges).toBe(0);

        console.log('✓ Mark all as read completed successfully');
    });
});

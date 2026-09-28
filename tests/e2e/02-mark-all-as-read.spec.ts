import { test, expect } from './fixtures';

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

        // Open options page
        const optionsPage = await context.newPage();
        await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
        await optionsPage.waitForLoadState('networkidle');

        // The unread count is rendered as soon as the page loads (it isn't hidden while
        // zero), so a fixed sleep here can't tell "not tracked yet" apart from "tracked,
        // still zero". Poll the count itself until the background service worker has
        // finished detecting and saving both tracked extensions (ours + the sample one).
        const unreadBadge = optionsPage.getByTestId('unread-updates-count');
        await expect(async () => {
            const text = await unreadBadge.textContent();
            expect(parseInt(text || '0', 10)).toBeGreaterThanOrEqual(2);
        }).toPass({ timeout: 15000 });

        const initialUnreadText = await unreadBadge.textContent();
        console.log(`Initial unread count: ${initialUnreadText}`);

        // Click "Mark All as Read" button
        const markAllButton = optionsPage.getByTestId('mark-all-read-button');
        await expect(markAllButton).toBeVisible();
        await markAllButton.click();

        // Verify the unread count reaches 0; toHaveText retries instead of trusting a
        // fixed delay to have been long enough for the click to be processed.
        const updatedUnreadBadge = optionsPage.getByTestId('unread-updates-count');
        await expect(updatedUnreadBadge).toHaveText('0', { timeout: 10000 });

        // Verify that items no longer have "New" badges
        const newBadges = await optionsPage.locator('.new-tag').count();
        expect(newBadges).toBe(0);

        console.log('✓ Mark all as read completed successfully');
    });
});

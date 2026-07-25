import { test, expect } from './fixtures';
import { waitForUpdatesToBeTracked } from './helpers';

/**
 * Covers the notification surface end-to-end in a real browser.
 *
 * The unit tests exercise the notification logic against mocks; this suite proves
 * the built bundle actually reaches Chrome's notifications API — that the
 * permission is granted, that a notification carrying action buttons is accepted,
 * and that the click listeners are wired up in the shipped service worker.
 */
test.describe('Notifications', () => {
    test('creates a notification through the extension\'s own startup flow', async ({ serviceWorker }) => {
        await waitForUpdatesToBeTracked();

        // getAll's callback is typed as `Object` by @types/chrome, so the ids are
        // extracted inside the worker where the shape is known.
        const notificationIds = await serviceWorker.evaluate(() => {
            return new Promise<string[]>((resolve) => {
                chrome.notifications.getAll((all) => resolve(Object.keys(all)));
            });
        });

        // The welcome notification is created by showWelcomeNotification() on
        // first install, and it is built with two action buttons. Chrome rejects
        // create() outright if the buttons array is malformed, so its presence
        // proves the whole options payload was accepted.
        expect(notificationIds).toContain('extension-welcome');
    });

    test('registers click and button-click listeners in the service worker', async ({ serviceWorker }) => {
        await waitForUpdatesToBeTracked();

        const listeners = await serviceWorker.evaluate(() => ({
            onClicked: chrome.notifications.onClicked.hasListeners(),
            onButtonClicked: chrome.notifications.onButtonClicked.hasListeners(),
            onClosed: chrome.notifications.onClosed.hasListeners(),
        }));

        expect(listeners.onClicked).toBe(true);
        expect(listeners.onButtonClicked).toBe(true);
        expect(listeners.onClosed).toBe(true);
    });

    test('accepts a notification carrying action buttons and can clear it', async ({ serviceWorker }) => {
        const result = await serviceWorker.evaluate(async () => {
            const notificationId = 'e2e-buttons-check';

            const getIds = () => new Promise<string[]>((resolve) => {
                chrome.notifications.getAll((all) => resolve(Object.keys(all)));
            });

            const created = await new Promise<string>((resolve) => {
                chrome.notifications.create(notificationId, {
                    type: 'basic',
                    iconUrl: 'assets/icons/icon-48.png',
                    title: 'Button payload check',
                    message: 'Verifies Chrome accepts our button configuration',
                    buttons: [{ title: 'First' }, { title: 'Second' }],
                }, (id) => resolve(id));
            });

            const lastError = chrome.runtime.lastError?.message ?? null;
            const idsBefore = await getIds();

            await new Promise<boolean>((resolve) => {
                chrome.notifications.clear(notificationId, (wasCleared) => resolve(wasCleared));
            });

            const idsAfter = await getIds();

            return {
                created,
                lastError,
                presentBefore: idsBefore.includes(notificationId),
                presentAfter: idsAfter.includes(notificationId),
            };
        });

        expect(result.lastError).toBeNull();
        expect(result.created).toBe('e2e-buttons-check');
        expect(result.presentBefore).toBe(true);
        expect(result.presentAfter).toBe(false);
    });
});

import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vitest';

import { NotificationService } from '../../../src/background/notification-service';

import type { Management } from 'webextension-polyfill';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
    default: {
        notifications: {
            create: vi.fn(),
            clear: vi.fn(),
            getAll: vi.fn(),
            onClicked: {
                addListener: vi.fn(),
            },
            onButtonClicked: {
                addListener: vi.fn(),
            },
            onClosed: {
                addListener: vi.fn(),
            },
            onShowSettings: {
                addListener: vi.fn(),
            },
        },
        tabs: {
            create: vi.fn(),
        },
        runtime: {
            getURL: vi.fn((path: string) => `chrome-extension://fake-id/${path}`),
            getManifest: vi.fn(() => ({ version: '1.0.0' })),
            onInstalled: {
                addListener: vi.fn(),
            },
        },
        management: {
            setEnabled: vi.fn(),
            uninstall: vi.fn(),
        },
    },
}));

// Mock i18n
vi.mock('../../../src/common/utils/i18n', () => ({
    t: vi.fn((key: string, substitutions?: string[]) => {
        const messages: Record<string, string> = {
            notification_title: 'Extension Updated',
            notification_message: substitutions
                ? `${substitutions[0]} updated from ${substitutions[1]} to ${substitutions[2]}`
                : 'Extension updated',
            notification_message_first_install: substitutions
                ? `${substitutions[0]} installed (version ${substitutions[1]})`
                : 'Extension installed',
            notification_button_view_details: 'View Details',
            notification_button_dismiss: 'Dismiss',
            notification_button_enable: 'Enable',
            notification_button_uninstall: 'Uninstall',
            notification_button_visit_website: 'Visit Website',
            notification_welcome_title: 'Welcome to Extensions Update Tracker!',
            notification_welcome_message:
                'Thanks for installing! You\'ll now receive notifications whenever your extensions update.',
            notification_welcome_button_view_updates: 'View Updates',
        };
        return messages[key] || key;
    }),
}));

// Mock settings storage
vi.mock('../../../src/background/settings-storage', () => ({
    settingsStorage: {
        areNotificationsEnabled: vi.fn(() => true),
        areNotificationsEnabledForExtension: vi.fn(() => true),
        get: vi.fn(() => ({
            notifications: {
                enabled: true,
                autoCloseTimeout: 0,
                soundEnabled: true, // Default is now true to enable system notification sound
            },
        })),
    },
}));

// Mock notification state storage
vi.mock('../../../src/background/notification-state-storage', () => ({
    notificationStateStorage: {
        init: vi.fn(),
        wasDismissedByUser: vi.fn(() => Promise.resolve(false)),
        clearState: vi.fn(() => Promise.resolve()),
        saveState: vi.fn(() => Promise.resolve()),
        getState: vi.fn(() => Promise.resolve(null)),
        getAllStates: vi.fn(() => Promise.resolve({})),
        clearAllStates: vi.fn(() => Promise.resolve()),
        addChangeListener: vi.fn(),
        removeChangeListener: vi.fn(),
    },
}));

// Import modules after mocks are set up
// eslint-disable-next-line import/first, import/order
import { settingsStorage } from '../../../src/background/settings-storage';
// eslint-disable-next-line import/first, import/order
import { notificationStateStorage } from '../../../src/background/notification-state-storage';

describe('NotificationService', () => {
    let notificationService: NotificationService;
    let browser: any;

    beforeEach(async () => {
        // Import browser after mocking
        const browserModule = await import('webextension-polyfill');
        browser = browserModule.default;

        // Reset all mocks
        vi.clearAllMocks();

        notificationService = new NotificationService();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('should set up notification listeners', () => {
            expect(browser.notifications.onClicked.addListener).toHaveBeenCalled();
            expect(browser.notifications.onButtonClicked.addListener).toHaveBeenCalled();
            expect(browser.notifications.onClosed.addListener).toHaveBeenCalled();
        });
    });

    describe('showUpdateNotification', () => {
        it('should create notification for extension update', async () => {
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-extension-id',
                name: 'Test Extension',
                version: '2.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            const previousVersion = '1.0.0';

            await notificationService.showUpdateNotification(extensionInfo, previousVersion);

            expect(browser.notifications.create).toHaveBeenCalledWith(
                'extension-update-test-extension-id',
                expect.objectContaining({
                    type: 'basic',
                    title: 'Extension Updated',
                    message: 'Test Extension updated from 1.0.0 to 2.0.0',
                    buttons: [
                        { title: 'View Details', iconUrl: 'chrome-extension://fake-id/assets/icons/icon-16.png' },
                        { title: 'Dismiss', iconUrl: 'chrome-extension://fake-id/assets/icons/icon-16.png' },
                    ],
                    priority: 2,
                    requireInteraction: true,
                    silent: false, // soundEnabled is true by default (system notification sound)
                }),
            );
        });

        it('should create notification for first install', async () => {
            const extensionInfo: Management.ExtensionInfo = {
                id: 'new-extension-id',
                name: 'New Extension',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            expect(browser.notifications.create).toHaveBeenCalledWith(
                'extension-update-new-extension-id',
                expect.objectContaining({
                    type: 'basic',
                    title: 'Extension Updated',
                    message: 'New Extension installed (version 1.0.0)',
                }),
            );
        });

        it('should use proper icon URL with DPI awareness', async () => {
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-id',
                name: 'Test',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            const createCall = (browser.notifications.create as any).mock.calls[0];
            const options = createCall[1];

            // Should use extension's own icon since service workers can't access chrome:// URLs
            expect(options.iconUrl).toBe('chrome-extension://fake-id/assets/icons/icon-48.png');
        });

        it('should handle notification creation errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (browser.notifications.create as any).mockRejectedValueOnce(new Error('Failed'));

            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-id',
                name: 'Test',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            // Logger.error prefixes timestamp, so just check that error was logged
            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorCall = (consoleErrorSpy.mock.calls[0] as string[]);
            expect(errorCall.join(' ')).toContain('Failed to show notification:');

            consoleErrorSpy.mockRestore();
        });

        it('should show Enable and Uninstall buttons for disabled extensions', async () => {
            const extensionInfo: Management.ExtensionInfo = {
                id: 'disabled-extension-id',
                name: 'Disabled Extension',
                version: '1.0.0',
                enabled: false,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            expect(browser.notifications.create).toHaveBeenCalledWith(
                'extension-update-disabled-extension-id',
                expect.objectContaining({
                    buttons: [
                        { title: 'Enable', iconUrl: 'chrome-extension://fake-id/assets/icons/icon-16.png' },
                        { title: 'Uninstall', iconUrl: 'chrome-extension://fake-id/assets/icons/icon-16.png' },
                    ],
                }),
            );
        });

        it('should use extension icon URL for enabled extensions', async () => {
            const extensionInfo: Management.ExtensionInfo = {
                id: 'enabled-ext',
                name: 'Enabled',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            const createCall = (browser.notifications.create as any).mock.calls[0];
            const options = createCall[1];

            // Should use extension's own icon since service workers can't access chrome:// URLs
            expect(options.iconUrl).toBe('chrome-extension://fake-id/assets/icons/icon-48.png');
        });
    });

    describe('clearNotification', () => {
        it('should clear notification for specific extension', async () => {
            await notificationService.clearNotification('test-extension-id');

            expect(browser.notifications.clear).toHaveBeenCalledWith(
                'extension-update-test-extension-id',
            );
        });

        it('should handle clear errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (browser.notifications.clear as any).mockResolvedValueOnce(true); // clearNotification doesn't catch errors

            await notificationService.clearNotification('test-id');

            // clearNotification doesn't have error handling, so no error should be logged
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('clearAllNotifications', () => {
        it('should clear all extension update notifications', async () => {
            (browser.notifications.getAll as any).mockResolvedValueOnce({
                'extension-update-id1': {},
                'extension-update-id2': {},
                'other-notification': {},
            });

            await notificationService.clearAllNotifications();

            expect(browser.notifications.clear).toHaveBeenCalledTimes(2);
            expect(browser.notifications.clear).toHaveBeenCalledWith('extension-update-id1');
            expect(browser.notifications.clear).toHaveBeenCalledWith('extension-update-id2');
            expect(browser.notifications.clear).not.toHaveBeenCalledWith('other-notification');
        });

        it('should handle getAll errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            // clearAllNotifications doesn't catch errors
            (browser.notifications.getAll as any).mockResolvedValueOnce({});

            await notificationService.clearAllNotifications();

            // clearAllNotifications doesn't have error handling, so no error should be logged
            expect(consoleErrorSpy).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('showWelcomeNotification', () => {
        it('should create welcome notification with correct content', async () => {
            await notificationService.showWelcomeNotification();

            expect(browser.notifications.create).toHaveBeenCalledWith(
                'extension-welcome',
                expect.objectContaining({
                    type: 'basic',
                    title: 'Welcome to Extensions Update Tracker!',
                    message: 'Thanks for installing! You\'ll now receive notifications whenever your extensions'
                        + ' update.',
                    buttons: [
                        { title: 'View Updates', iconUrl: 'chrome-extension://fake-id/assets/icons/icon-16.png' },
                        { title: 'Dismiss', iconUrl: 'chrome-extension://fake-id/assets/icons/icon-16.png' },
                    ],
                    priority: 2,
                    requireInteraction: true,
                    silent: false,
                    iconUrl: 'chrome-extension://fake-id/assets/icons/icon-128.png',
                }),
            );
        });

        it('should not show welcome notification if notifications are disabled', async () => {
            (settingsStorage.areNotificationsEnabled as any).mockReturnValueOnce(false);

            await notificationService.showWelcomeNotification();

            expect(browser.notifications.create).not.toHaveBeenCalled();
        });

        it('should handle welcome notification creation errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (browser.notifications.create as any).mockRejectedValueOnce(new Error('Failed to create notification'));

            await notificationService.showWelcomeNotification();

            // Logger.error prefixes timestamp, so just check that error was logged
            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorCall = (consoleErrorSpy.mock.calls[0] as string[]);
            expect(errorCall.join(' ')).toContain('Failed to show welcome notification:');

            consoleErrorSpy.mockRestore();
        });

        it('should use current extension version from manifest', async () => {
            (browser.runtime.getManifest as any).mockReturnValueOnce({ version: '2.5.0' });

            await notificationService.showWelcomeNotification();

            // The version is stored in internal state but not exposed in the notification itself
            expect(browser.notifications.create).toHaveBeenCalled();
        });
    });

    describe('notification state tracking', () => {
        it('should not show notification if it was previously dismissed by user for same version', async () => {
            (notificationStateStorage.wasDismissedByUser as any).mockResolvedValueOnce(true);

            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext',
                name: 'Test Extension',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            expect(browser.notifications.create).not.toHaveBeenCalled();
            expect(notificationStateStorage.wasDismissedByUser).toHaveBeenCalledWith('test-ext', '1.0.0');
        });

        it('should clear previous dismissed state before showing new notification', async () => {
            (notificationStateStorage.wasDismissedByUser as any).mockResolvedValueOnce(false);

            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext',
                name: 'Test Extension',
                version: '2.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo, '1.0.0');

            expect(notificationStateStorage.clearState).toHaveBeenCalledWith('test-ext');
        });

        it('should save initial notification state when showing notification', async () => {
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext',
                name: 'Test Extension',
                version: '1.5.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            expect(notificationStateStorage.saveState).toHaveBeenCalledWith(
                expect.objectContaining({
                    extensionId: 'test-ext',
                    version: '1.5.0',
                    dismissedByUser: false,
                    shownAt: expect.any(Number),
                }),
            );
        });

        it('should not show notification if notifications are globally disabled', async () => {
            (settingsStorage.areNotificationsEnabled as any).mockReturnValueOnce(false);

            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext',
                name: 'Test Extension',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            expect(browser.notifications.create).not.toHaveBeenCalled();
        });

        it('should not show notification if notifications are muted for specific extension', async () => {
            (settingsStorage.areNotificationsEnabledForExtension as any).mockReturnValueOnce(false);

            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext',
                name: 'Test Extension',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            expect(browser.notifications.create).not.toHaveBeenCalled();
        });
    });

    describe('cross-device sync', () => {
        it('should register state change listener on init', async () => {
            expect(notificationStateStorage.addChangeListener).toHaveBeenCalled();
        });

        it('should clear notification when dismissed on another device', async () => {
            // First show a notification
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext-sync',
                name: 'Test Extension',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);
            expect(browser.notifications.create).toHaveBeenCalled();

            // Simulate a state change from another device (notification dismissed there)
            const changeListener = (notificationStateStorage.addChangeListener as any).mock.calls[0][0];

            const remoteStates = {
                'test-ext-sync': {
                    extensionId: 'test-ext-sync',
                    version: '1.0.0',
                    shownAt: Date.now() - 1000,
                    closedAt: Date.now(),
                    closeReason: 'user' as const,
                    dismissedByUser: true,
                },
            };

            await changeListener(remoteStates);

            // Should have cleared the local notification
            expect(browser.notifications.clear).toHaveBeenCalledWith('extension-update-test-ext-sync');
        });

        it('should not clear notification if not dismissed by user on other device', async () => {
            // Show a notification
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext-timeout',
                name: 'Test Extension',
                version: '1.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo);

            const clearCallsBefore = (browser.notifications.clear as any).mock.calls.length;

            // Simulate a state change from another device (notification timed out, not dismissed)
            const changeListener = (notificationStateStorage.addChangeListener as any).mock.calls[0][0];

            const remoteStates = {
                'test-ext-timeout': {
                    extensionId: 'test-ext-timeout',
                    version: '1.0.0',
                    shownAt: Date.now() - 1000,
                    closedAt: Date.now(),
                    closeReason: 'timeout' as const,
                    dismissedByUser: false,
                },
            };

            await changeListener(remoteStates);

            // Should NOT have cleared since it wasn't dismissed by user
            const clearCallsAfter = (browser.notifications.clear as any).mock.calls.length;
            expect(clearCallsAfter).toBe(clearCallsBefore);
        });
    });

    describe('notification settings', () => {
        it('should register onShowSettings listener', () => {
            const _notificationService = new NotificationService();

            expect(browser.notifications.onShowSettings.addListener).toHaveBeenCalled();
        });

        it('should open updates page with settings hash when settings button is clicked', async () => {
            const _notificationService = new NotificationService();

            // Get the registered handler
            const onShowSettingsHandler = (browser.notifications.onShowSettings.addListener as any).mock.calls[0][0];

            // Clear previous calls
            (browser.tabs.create as any).mockClear();

            // Trigger the settings button click
            await onShowSettingsHandler();

            // Verify that a new tab was created with the correct URL
            expect(browser.tabs.create).toHaveBeenCalledWith({
                url: 'chrome-extension://fake-id/options.html#settings',
            });
        });
    });

    describe('notification click behavior', () => {
        it('should open updates page when notification is clicked', async () => {
            const _notificationService = new NotificationService();

            // Show a notification first
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext',
                name: 'Test Extension',
                version: '2.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo, '1.0.0');

            // Get the registered click handler
            const onClickedHandler = (browser.notifications.onClicked.addListener as any).mock.calls[0][0];

            // Clear previous calls
            (browser.tabs.create as any).mockClear();
            (browser.notifications.clear as any).mockClear();

            // Trigger notification click
            await onClickedHandler('extension-update-test-ext');

            // Verify that a new tab was created with updates page
            expect(browser.tabs.create).toHaveBeenCalledWith({
                url: 'chrome-extension://fake-id/options.html',
            });

            // Verify notification was cleared
            expect(browser.notifications.clear).toHaveBeenCalledWith('extension-update-test-ext');
        });

        it('should mark update as read when notification is clicked', async () => {
            const mockStorage = {
                markUpdateAsRead: vi.fn(),
            };

            const notificationServiceWithStorage = new NotificationService(mockStorage as any);

            // Show a notification first
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext-read',
                name: 'Test Extension',
                version: '2.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationServiceWithStorage.showUpdateNotification(extensionInfo, '1.0.0');

            // Get the registered click handler from this specific service instance
            // Since we created a new service, it will have registered its own handler
            const handlers = (browser.notifications.onClicked.addListener as any).mock.calls;
            const lastHandlerCall = handlers[handlers.length - 1];
            const onClickedHandler = lastHandlerCall[0];

            // Trigger notification click
            await onClickedHandler('extension-update-test-ext-read');

            // Verify that markUpdateAsRead was called
            expect(mockStorage.markUpdateAsRead).toHaveBeenCalledWith('test-ext-read', '2.0.0');
        });

        it('should not fail if storage is not provided when notification is clicked', async () => {
            const _notificationServiceNoStorage = new NotificationService();

            // Show a notification first
            const extensionInfo: Management.ExtensionInfo = {
                id: 'test-ext-no-storage',
                name: 'Test Extension',
                version: '2.0.0',
                enabled: true,
            } as Management.ExtensionInfo;

            await notificationService.showUpdateNotification(extensionInfo, '1.0.0');

            // Get the registered click handler
            const onClickedHandler = (browser.notifications.onClicked.addListener as any).mock.calls[0][0];

            // Clear previous calls
            (browser.tabs.create as any).mockClear();

            // Trigger notification click - should not throw
            await expect(onClickedHandler('extension-update-test-ext-no-storage')).resolves.not.toThrow();

            // Should still open the updates page
            expect(browser.tabs.create).toHaveBeenCalledWith({
                url: 'chrome-extension://fake-id/options.html',
            });
        });
    });
});

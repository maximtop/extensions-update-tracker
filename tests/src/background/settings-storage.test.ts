import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
} from 'vitest';

import { SettingsStorage } from '../../../src/background/settings-storage';
import { DEFAULT_SETTINGS } from '../../../src/common/types/settings-types';

// Create storage outside the mock for test access
const mockStorage: Record<string, any> = {};

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => {
    return {
        default: {
            storage: {
                local: {
                    get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
                    set: vi.fn((data: Record<string, any>) => {
                        Object.assign(mockStorage, data);
                        return Promise.resolve();
                    }),
                },
                onChanged: {
                    addListener: vi.fn(),
                },
            },
        },
    };
});

describe('SettingsStorage', () => {
    let settingsStorage: SettingsStorage;
    let browser: any;

    beforeEach(async () => {
        // Clear mock storage
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        vi.clearAllMocks();

        // Import browser after mocking
        const browserModule = await import('webextension-polyfill');
        browser = browserModule.default;

        settingsStorage = new SettingsStorage();
        // Wait for async init to complete
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 10);
        });
    });

    describe('load', () => {
        it('should load default settings when storage is empty', async () => {
            const settings = await settingsStorage.load();

            expect(settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should load stored settings from storage', async () => {
            const storedSettings = {
                notifications: {
                    enabled: false,
                    autoCloseTimeout: 20,
                    soundEnabled: true,
                },
                extensionPreferences: {
                    mutedExtensions: { 'ext-1': true },
                },
                security: {
                    autoDisableOnUpdate: true,
                },
            };

            (browser.storage.local.get as any).mockResolvedValueOnce({
                'user-settings': storedSettings,
            });

            const settings = await settingsStorage.load();

            expect(settings).toEqual(storedSettings);
        });

        it('should merge incomplete settings with defaults', async () => {
            const partialSettings = {
                notifications: {
                    enabled: false,
                },
            };

            (browser.storage.local.get as any).mockResolvedValueOnce({
                'user-settings': partialSettings,
            });

            const settings = await settingsStorage.load();

            // StorageService should merge partial settings with defaults
            expect(settings).toEqual({
                ...DEFAULT_SETTINGS,
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false, // User's value preserved
                },
            });
        });
    });

    describe('save', () => {
        it('should save settings to storage', async () => {
            const newSettings = {
                ...DEFAULT_SETTINGS,
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            };

            await settingsStorage.save(newSettings);

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                'user-settings': newSettings,
            });
        });
    });

    describe('update', () => {
        it('should update partial settings', async () => {
            await settingsStorage.update({
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            });

            const settings = settingsStorage.get();
            expect(settings.notifications.enabled).toBe(false);
            expect(settings.security).toEqual(DEFAULT_SETTINGS.security);
        });
    });

    describe('areNotificationsEnabled', () => {
        it('should return true by default', async () => {
            await settingsStorage.load();
            expect(settingsStorage.areNotificationsEnabled()).toBe(true);
        });

        it('should return false when notifications are disabled', async () => {
            await settingsStorage.update({
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            });

            expect(settingsStorage.areNotificationsEnabled()).toBe(false);
        });
    });

    describe('areNotificationsEnabledForExtension', () => {
        it('should return true for unmuted extensions', async () => {
            await settingsStorage.load();
            expect(settingsStorage.areNotificationsEnabledForExtension('ext-1')).toBe(true);
        });

        it('should return false when notifications are globally disabled', async () => {
            await settingsStorage.update({
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            });

            expect(settingsStorage.areNotificationsEnabledForExtension('ext-1')).toBe(false);
        });

        it('should return false for muted extensions', async () => {
            await settingsStorage.setExtensionMuted('ext-1', true);

            expect(settingsStorage.areNotificationsEnabledForExtension('ext-1')).toBe(false);
        });
    });

    describe('setExtensionMuted', () => {
        it('should mute extension notifications', async () => {
            await settingsStorage.setExtensionMuted('ext-1', true);

            const settings = settingsStorage.get();
            expect(settings.extensionPreferences.mutedExtensions['ext-1']).toBe(true);
        });

        it('should unmute extension notifications', async () => {
            await settingsStorage.setExtensionMuted('ext-1', true);
            await settingsStorage.setExtensionMuted('ext-1', false);

            const settings = settingsStorage.get();
            expect(settings.extensionPreferences.mutedExtensions['ext-1']).toBeUndefined();
        });
    });

    describe('reset', () => {
        it('should reset settings to defaults', async () => {
            await settingsStorage.update({
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            });

            await settingsStorage.reset();

            expect(settingsStorage.get()).toEqual(DEFAULT_SETTINGS);
        });
    });

    describe('change listeners', () => {
        it('should call listeners when settings change', async () => {
            const listener = vi.fn();
            settingsStorage.addChangeListener(listener);

            await settingsStorage.update({
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            });

            expect(listener).toHaveBeenCalled();
        });

        it('should not call removed listeners', async () => {
            const listener = vi.fn();
            settingsStorage.addChangeListener(listener);
            settingsStorage.removeChangeListener(listener);

            await settingsStorage.update({
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    enabled: false,
                },
            });

            expect(listener).not.toHaveBeenCalled();
        });
    });
});

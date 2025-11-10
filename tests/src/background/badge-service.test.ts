import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
} from 'vitest';

import { BadgeService } from '../../../src/background/badge-service';
import { ExtensionsUpdateStorage } from '../../../src/background/extensions-update-storage';
import { MessageDispatcherService } from '../../../src/common/messaging/message-handler';

import type { StorageAdapter } from '../../../src/background/storage-adapter';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
    default: {
        action: {
            setBadgeText: vi.fn(),
            setBadgeBackgroundColor: vi.fn(),
            setBadgeTextColor: vi.fn(),
        },
    },
}));

// In-memory StorageAdapter
class InMemoryStorageAdapter implements StorageAdapter {
    private store: Record<string, any>;

    constructor(initial: Record<string, any> = {}) {
        this.store = { ...initial };
    }

    async get(key: string) {
        return this.store[key];
    }

    async set(key: string, value: any) {
        this.store[key] = value;
    }
}

describe('BadgeService', () => {
    let badgeService: BadgeService;
    let storage: ExtensionsUpdateStorage;
    let storageAdapter: InMemoryStorageAdapter;
    let messageHandler: MessageDispatcherService;
    let browser: any;

    beforeEach(async () => {
        // Dynamic import required: Must import webextension-polyfill AFTER vi.mock() is set up
        // to ensure the mocked version is loaded instead of the real module
        const browserModule = await import('webextension-polyfill');
        browser = browserModule.default;

        // Reset mocks
        vi.clearAllMocks();

        storageAdapter = new InMemoryStorageAdapter();
        storage = new ExtensionsUpdateStorage(storageAdapter);
        await storage.init();

        messageHandler = new MessageDispatcherService();
        badgeService = new BadgeService(storage, messageHandler);
    });

    describe('initialization', () => {
        it('should update badge on init', () => {
            expect(browser.action.setBadgeText).toHaveBeenCalled();
        });
    });

    describe('updateBadge', () => {
        it('should clear badge when no unread updates', async () => {
            await badgeService.updateBadge();

            expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
        });

        it('should show badge count for unread updates', async () => {
            // Add some unread updates to storage
            const storageData = {
                'ext-1': {
                    currentVersion: '2.0.0',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: true,
                        },
                        {
                            version: '2.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: false, // Unread
                        },
                    ],
                },
                'ext-2': {
                    currentVersion: '3.0.0',
                    updateHistory: [
                        {
                            version: '2.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: false, // Unread
                        },
                        {
                            version: '3.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: false, // Unread
                        },
                    ],
                },
            };

            // Create a new storage adapter with test data
            const newStorageAdapter = new InMemoryStorageAdapter({ 'extensions-update-storage': storageData });
            const newStorage = new ExtensionsUpdateStorage(newStorageAdapter);
            await newStorage.init();

            // Clear mocks after storage init, before creating badge service
            vi.clearAllMocks();

            // Re-setup the mock implementations after clearing
            (browser.action.setBadgeText as any).mockResolvedValue(undefined);
            (browser.action.setBadgeBackgroundColor as any).mockResolvedValue(undefined);
            (browser.action.setBadgeTextColor as any).mockResolvedValue(undefined);

            // Create new badge service with updated storage
            badgeService = new BadgeService(newStorage, messageHandler);

            // Wait for async init and updateBadge to complete
            await vi.waitFor(() => {
                expect(browser.action.setBadgeText).toHaveBeenCalled();
            }, { timeout: 100 });

            expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '3' });
            expect(browser.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
                color: '#FF0000',
            });
        });

        it('should show "99+" for more than 99 unread updates', async () => {
            // Create storage with 100+ unread updates
            const updates = Array.from({ length: 100 }, (_, i) => ({
                version: `${i + 1}.0.0`,
                detectedTimestampMs: Date.now(),
                isRead: false,
            }));

            const storageData = {
                'ext-1': {
                    currentVersion: '100.0.0',
                    updateHistory: updates,
                },
            };

            // Create a new storage adapter with test data
            const newStorageAdapter = new InMemoryStorageAdapter({ 'extensions-update-storage': storageData });
            const newStorage = new ExtensionsUpdateStorage(newStorageAdapter);
            await newStorage.init();

            vi.clearAllMocks();
            (browser.action.setBadgeText as any).mockResolvedValue(undefined);
            (browser.action.setBadgeBackgroundColor as any).mockResolvedValue(undefined);
            (browser.action.setBadgeTextColor as any).mockResolvedValue(undefined);

            badgeService = new BadgeService(newStorage, messageHandler);

            await vi.waitFor(() => {
                expect(browser.action.setBadgeText).toHaveBeenCalled();
            }, { timeout: 100 });

            expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '99+' });
        });

        it('should handle setBadgeTextColor if available', async () => {
            const storageData = {
                'ext-1': {
                    currentVersion: '1.0.0',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: false,
                        },
                    ],
                },
            };

            // Create a new storage adapter with test data
            const newStorageAdapter = new InMemoryStorageAdapter({ 'extensions-update-storage': storageData });
            const newStorage = new ExtensionsUpdateStorage(newStorageAdapter);
            await newStorage.init();

            // Clear mocks after storage init
            vi.clearAllMocks();

            // Re-setup the mock implementations after clearing
            (browser.action.setBadgeText as any).mockResolvedValue(undefined);
            (browser.action.setBadgeBackgroundColor as any).mockResolvedValue(undefined);
            (browser.action.setBadgeTextColor as any).mockResolvedValue(undefined);

            badgeService = new BadgeService(newStorage, messageHandler);

            // Wait for async init and updateBadge to complete
            await vi.waitFor(() => {
                expect(browser.action.setBadgeTextColor).toHaveBeenCalled();
            }, { timeout: 100 });

            expect(browser.action.setBadgeTextColor).toHaveBeenCalledWith({
                color: '#FFFFFF',
            });
        });

        it('should handle errors gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (browser.action.setBadgeText as any).mockRejectedValueOnce(new Error('Failed'));

            await badgeService.updateBadge();

            // Logger outputs 3 params: timestamp, message, error
            const { calls } = consoleErrorSpy.mock;
            expect(calls.length).toBeGreaterThan(0);
            const firstCall = calls[0];
            expect(firstCall[1]).toContain('Failed to update badge:');
            expect(firstCall[2]).toContain('Error: Failed');

            consoleErrorSpy.mockRestore();
        });
    });

    describe('clearBadge', () => {
        it('should clear badge text', async () => {
            await badgeService.clearBadge();

            expect(browser.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
        });

        it('should handle clear errors', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            (browser.action.setBadgeText as any).mockRejectedValueOnce(new Error('Failed'));

            await badgeService.clearBadge();

            // Logger outputs 3 params: timestamp, message, error
            const { calls } = consoleErrorSpy.mock;
            expect(calls.length).toBeGreaterThan(0);
            const firstCall = calls[0];
            expect(firstCall[1]).toContain('Failed to clear badge:');
            expect(firstCall[2]).toContain('Error: Failed');

            consoleErrorSpy.mockRestore();
        });
    });

    describe('refresh', () => {
        it('should trigger badge update', async () => {
            vi.clearAllMocks();

            await badgeService.refresh();

            expect(browser.action.setBadgeText).toHaveBeenCalled();
        });
    });
});

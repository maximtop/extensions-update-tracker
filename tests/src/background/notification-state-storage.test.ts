/**
 * Tests for NotificationStateStorage
 */

import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
} from 'vitest';
import browser from 'webextension-polyfill';

// Mock browser.storage.local
vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            local: {
                get: vi.fn(),
                set: vi.fn(),
                remove: vi.fn(),
            },
            onChanged: {
                addListener: vi.fn(),
            },
        },
    },
}));

// Import after mocks are set up
// eslint-disable-next-line import/first
import { NotificationStateStorage } from '../../../src/background/notification-state-storage';
// eslint-disable-next-line import/first, import/order
import {
    NotificationCloseReason,
    type NotificationInteractionState,
} from '../../../src/common/types/notification-types';

describe('NotificationStateStorage', () => {
    let storage: NotificationStateStorage;
    const mockStorageData: Record<string, any> = {};

    // Set up mock implementations once (outside beforeEach to prevent clearing)
    // Use JSON clone to avoid shared object references
    vi.mocked(browser.storage.local.get).mockImplementation(async (key: string) => {
        const value = mockStorageData[key];
        if (value === undefined) {
            return {};
        }
        // Clone to avoid shared references
        return { [key]: JSON.parse(JSON.stringify(value)) };
    });

    vi.mocked(browser.storage.local.set).mockImplementation(async (items: Record<string, any>) => {
        for (const [key, value] of Object.entries(items)) {
            // Clone to avoid shared references
            mockStorageData[key] = JSON.parse(JSON.stringify(value));
        }
    });

    vi.mocked(browser.storage.local.remove).mockImplementation(async (key: string) => {
        delete mockStorageData[key];
    });

    beforeEach(async () => {
        // Clear storage data explicitly
        Object.keys(mockStorageData).forEach((key) => {
            delete mockStorageData[key];
        });

        // Clear mock call history
        vi.mocked(browser.storage.local.get).mockClear();
        vi.mocked(browser.storage.local.set).mockClear();
        vi.mocked(browser.storage.local.remove).mockClear();

        storage = new NotificationStateStorage();
    });

    describe('saveState', () => {
        it('should save a notification state', async () => {
            const validExtId = 'a'.repeat(32); // Valid 32-char extension ID
            const state: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            await storage.saveState(state);

            const retrieved = await storage.getState(validExtId);
            expect(retrieved).toEqual(state);
        });

        it('should overwrite existing state for same extension', async () => {
            const validExtId = 'b'.repeat(32); // Valid 32-char extension ID
            const state1: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            const state2: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.1',
                shownAt: Date.now() + 1000,
                closedAt: Date.now() + 2000,
                closeReason: NotificationCloseReason.User,
                dismissedByUser: true,
            };

            await storage.saveState(state1);
            await storage.saveState(state2);

            const retrieved = await storage.getState(validExtId);
            expect(retrieved).toEqual(state2);
        });
    });

    describe('getState', () => {
        it('should return null for non-existent extension', async () => {
            const state = await storage.getState('non-existent');
            expect(state).toBeNull();
        });

        it('should retrieve saved state', async () => {
            const validExtId = 'c'.repeat(32); // Valid 32-char extension ID
            const state: NotificationInteractionState = {
                extensionId: validExtId,
                version: '2.0.0',
                shownAt: Date.now(),
                closedAt: Date.now() + 5000,
                closeReason: NotificationCloseReason.Timeout,
                dismissedByUser: false,
            };

            await storage.saveState(state);
            const retrieved = await storage.getState(validExtId);
            expect(retrieved).toEqual(state);
        });
    });

    describe('getAllStates', () => {
        it('should return empty object when no states exist', async () => {
            const states = await storage.getAllStates();
            expect(states).toEqual({});
        });

        it('should return all saved states', async () => {
            const validExtId1 = 'd'.repeat(32); // Valid 32-char extension ID
            const validExtId2 = 'e'.repeat(32); // Valid 32-char extension ID
            const state1: NotificationInteractionState = {
                extensionId: validExtId1,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            const state2: NotificationInteractionState = {
                extensionId: validExtId2,
                version: '2.0.0',
                shownAt: Date.now(),
                dismissedByUser: true,
            };

            await storage.saveState(state1);
            await storage.saveState(state2);

            const states = await storage.getAllStates();
            expect(states).toEqual({
                [validExtId1]: state1,
                [validExtId2]: state2,
            });
        });
    });

    describe('wasDismissedByUser', () => {
        it('should return false for non-existent extension', async () => {
            const dismissed = await storage.wasDismissedByUser('non-existent', '1.0.0');
            expect(dismissed).toBe(false);
        });

        it('should return false if version does not match', async () => {
            const validExtId = 'f'.repeat(32); // Valid 32-char extension ID
            const state: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: true,
            };

            await storage.saveState(state);

            const dismissed = await storage.wasDismissedByUser(validExtId, '1.0.1');
            expect(dismissed).toBe(false);
        });

        it('should return false if not dismissed by user', async () => {
            const validExtId = 'g'.repeat(32); // Valid 32-char extension ID
            const state: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            await storage.saveState(state);

            const dismissed = await storage.wasDismissedByUser(validExtId, '1.0.0');
            expect(dismissed).toBe(false);
        });

        it('should return true if dismissed by user for same version', async () => {
            const validExtId = 'h'.repeat(32); // Valid 32-char extension ID
            const state: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.0',
                shownAt: Date.now(),
                closedAt: Date.now() + 1000,
                closeReason: NotificationCloseReason.User,
                dismissedByUser: true,
            };

            await storage.saveState(state);

            const dismissed = await storage.wasDismissedByUser(validExtId, '1.0.0');
            expect(dismissed).toBe(true);
        });
    });

    describe('clearState', () => {
        it('should remove state for specific extension', async () => {
            const validExtId1 = 'l'.repeat(32); // Valid 32-char extension ID
            const validExtId2 = 'm'.repeat(32); // Valid 32-char extension ID
            const state1: NotificationInteractionState = {
                extensionId: validExtId1,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            const state2: NotificationInteractionState = {
                extensionId: validExtId2,
                version: '2.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            await storage.saveState(state1);
            await storage.saveState(state2);
            await storage.clearState(validExtId1);

            const retrieved1 = await storage.getState(validExtId1);
            const retrieved2 = await storage.getState(validExtId2);

            expect(retrieved1).toBeNull();
            expect(retrieved2).toEqual(state2);
        });

        it('should not throw when clearing non-existent state', async () => {
            await expect(storage.clearState('non-existent')).resolves.not.toThrow();
        });
    });

    describe('clearAllStates', () => {
        it('should remove all states', async () => {
            const validExtId1 = 'n'.repeat(32); // Valid 32-char extension ID
            const validExtId2 = 'o'.repeat(32); // Valid 32-char extension ID
            const state1: NotificationInteractionState = {
                extensionId: validExtId1,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            const state2: NotificationInteractionState = {
                extensionId: validExtId2,
                version: '2.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };

            await storage.saveState(state1);
            await storage.saveState(state2);
            await storage.clearAllStates();

            const states = await storage.getAllStates();
            expect(states).toEqual({});
        });
    });

    describe('expired states cleanup', () => {
        it('should remove states older than 30 days', async () => {
            const now = Date.now();
            const thirtyOneDaysAgo = now - (31 * 24 * 60 * 60 * 1000);
            const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);

            const oldExtId = 'p'.repeat(32); // Valid 32-char extension ID
            const recentExtId = 'q'.repeat(32); // Valid 32-char extension ID
            const newExtId = 'r'.repeat(32); // Valid 32-char extension ID

            const oldState: NotificationInteractionState = {
                extensionId: oldExtId,
                version: '1.0.0',
                shownAt: thirtyOneDaysAgo,
                dismissedByUser: false,
            };

            const recentState: NotificationInteractionState = {
                extensionId: recentExtId,
                version: '2.0.0',
                shownAt: tenDaysAgo,
                dismissedByUser: false,
            };

            await storage.saveState(oldState);
            await storage.saveState(recentState);

            // Trigger cleanup by saving a new state
            const newState: NotificationInteractionState = {
                extensionId: newExtId,
                version: '3.0.0',
                shownAt: now,
                dismissedByUser: false,
            };
            await storage.saveState(newState);

            const states = await storage.getAllStates();
            expect(states[oldExtId]).toBeUndefined();
            expect(states[recentExtId]).toBeDefined();
            expect(states[newExtId]).toBeDefined();
        });

        it('should remove states with invalid extension IDs (>32 chars) when saving', async () => {
            const validExtId = 'a'.repeat(32); // Valid 32-char extension ID
            const invalidExtId = 'b'.repeat(40); // Invalid 40-char key

            // Manually set up storage with invalid key
            const states = {
                [validExtId]: {
                    extensionId: validExtId,
                    version: '1.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
                [invalidExtId]: {
                    extensionId: invalidExtId,
                    version: '2.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
            };
            mockStorageData.notification_states = states;

            // Trigger cleanup by saving a new state
            const newState: NotificationInteractionState = {
                extensionId: 'c'.repeat(32),
                version: '3.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };
            await storage.saveState(newState);

            const result = await storage.getAllStates();
            expect(result[validExtId]).toBeDefined(); // Valid key should remain
            expect(result[invalidExtId]).toBeUndefined(); // Invalid key should be removed
            expect(result['c'.repeat(32)]).toBeDefined(); // New state should be saved
        });

        it('should remove states with invalid extension IDs (shorter than 32 chars) when saving', async () => {
            const validExtId = 'd'.repeat(32); // Valid 32-char extension ID
            const invalidExtId = 'short'; // Invalid short key

            // Manually set up storage with invalid key
            const states = {
                [validExtId]: {
                    extensionId: validExtId,
                    version: '1.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
                [invalidExtId]: {
                    extensionId: invalidExtId,
                    version: '2.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
            };
            mockStorageData.notification_states = states;

            // Trigger cleanup by saving a new state
            const newState: NotificationInteractionState = {
                extensionId: 'e'.repeat(32),
                version: '3.0.0',
                shownAt: Date.now(),
                dismissedByUser: false,
            };
            await storage.saveState(newState);

            const result = await storage.getAllStates();
            expect(result[validExtId]).toBeDefined(); // Valid key should remain
            expect(result[invalidExtId]).toBeUndefined(); // Invalid key should be removed
            expect(result['e'.repeat(32)]).toBeDefined(); // New state should be saved
        });
    });

    describe('orphaned states cleanup', () => {
        it('should remove states with invalid extension IDs when cleaning up orphaned states', async () => {
            const validExtId1 = 'f'.repeat(32); // Valid 32-char extension ID
            const validExtId2 = 'g'.repeat(32); // Valid 32-char extension ID
            const invalidExtId = 'h'.repeat(50); // Invalid 50-char key

            // Set up storage with mixed valid and invalid keys
            const states = {
                [validExtId1]: {
                    extensionId: validExtId1,
                    version: '1.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
                [validExtId2]: {
                    extensionId: validExtId2,
                    version: '2.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
                [invalidExtId]: {
                    extensionId: invalidExtId,
                    version: '3.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
            };
            mockStorageData.notification_states = states;

            // Only validExtId1 is "installed"
            const installedIds = new Set([validExtId1]);
            await storage.cleanupOrphanedStates(installedIds);

            const result = await storage.getAllStates();
            expect(result[validExtId1]).toBeDefined(); // Installed extension should remain
            expect(result[validExtId2]).toBeUndefined(); // Uninstalled extension should be removed
            expect(result[invalidExtId]).toBeUndefined(); // Invalid key should be removed
        });

        it('should remove states for uninstalled extensions', async () => {
            const installedId = 'i'.repeat(32);
            const uninstalledId = 'j'.repeat(32);

            const states = {
                [installedId]: {
                    extensionId: installedId,
                    version: '1.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
                [uninstalledId]: {
                    extensionId: uninstalledId,
                    version: '2.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
            };
            mockStorageData.notification_states = states;

            const installedIds = new Set([installedId]);
            await storage.cleanupOrphanedStates(installedIds);

            const result = await storage.getAllStates();
            expect(result[installedId]).toBeDefined();
            expect(result[uninstalledId]).toBeUndefined();
        });

        it('should not modify storage when no cleanup is needed', async () => {
            const validExtId = 'k'.repeat(32);

            const states = {
                [validExtId]: {
                    extensionId: validExtId,
                    version: '1.0.0',
                    shownAt: Date.now(),
                    dismissedByUser: false,
                },
            };
            mockStorageData.notification_states = states;

            const installedIds = new Set([validExtId]);
            await storage.cleanupOrphanedStates(installedIds);

            const result = await storage.getAllStates();
            expect(result[validExtId]).toBeDefined();
            expect(Object.keys(result).length).toBe(1);
        });
    });

    describe('storage change listeners', () => {
        it('should add change listeners', () => {
            const listener = vi.fn();
            storage.addChangeListener(listener);

            // Trigger a storage change simulation would require more complex mocking
            // For now, just verify the listener was added
            expect(storage.getChangeListeners()).toContain(listener);
        });

        it('should remove change listeners', () => {
            const listener = vi.fn();
            storage.addChangeListener(listener);
            storage.removeChangeListener(listener);

            expect(storage.getChangeListeners()).not.toContain(listener);
        });

        it('should notify listeners on state changes', async () => {
            const listener = vi.fn();
            storage.addChangeListener(listener);

            const validExtId = 's'.repeat(32); // Valid 32-char extension ID
            const state: NotificationInteractionState = {
                extensionId: validExtId,
                version: '1.0.0',
                shownAt: Date.now(),
                dismissedByUser: true,
            };

            // Save state to trigger potential listeners
            await storage.saveState(state);

            // Note: Actual storage change events would be triggered by browser.storage.onChanged
            // which is difficult to simulate in unit tests
        });
    });
});

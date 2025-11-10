import {
    describe,
    expect,
    it,
    vi,
    beforeEach,
    afterEach,
} from 'vitest';

// Mock webextension-polyfill to prevent "This script should only be loaded in a browser extension" error
vi.mock('webextension-polyfill', () => ({
    default: {
        i18n: {
            getMessage: vi.fn((key: string) => key),
            getUILanguage: vi.fn(() => 'en'),
        },
    },
}));

// Import after mocks are set up
// eslint-disable-next-line import/first
import { ExtensionsUpdateStorage } from '../../../src/background/extensions-update-storage';

describe('ExtensionsUpdateStorage', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should initialize with an empty object', async () => {
        const storageAdapterMock = {
            get: vi.fn(),
            set: vi.fn(),
        };

        const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
        await extensionsUpdateStorage.init();
        expect(extensionsUpdateStorage.getStorage()).toEqual({});
        expect(storageAdapterMock.get).toHaveBeenCalledWith(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
    });

    it('should initialize with an empty object if data has invalid format', async () => {
        const storageAdapterMock = {
            get: vi.fn(),
            set: vi.fn(),
        };
        storageAdapterMock.get.mockResolvedValue({
            'extension-id': {},
        });

        const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
        await extensionsUpdateStorage.init();
        expect(extensionsUpdateStorage.getStorage()).toEqual({});
        expect(storageAdapterMock.get).toHaveBeenCalledWith(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
        // Logger outputs timestamp, message, errors as separate params
        const { calls } = (console.error as any).mock;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][1]).toContain('Failed to parse extensions update storage:');
    });

    it('should initialize with object from the storage if data has valid format', async () => {
        const storageAdapterMock = {
            get: vi.fn(),
            set: vi.fn(),
        };

        const validData = {
            'extension-id': {
                currentVersion: '1.0.0',
                // @ts-expect-error - updateHistory is not required
                updateHistory: [],
            },
        };
        storageAdapterMock.get.mockResolvedValue(validData);

        const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
        await extensionsUpdateStorage.init();
        expect(extensionsUpdateStorage.getStorage()).toEqual(validData);
    });

    describe('markUpdateAsRead', () => {
        it('should mark the latest update as read when no version is specified', async () => {
            const storageAdapterMock = {
                get: vi.fn(),
                set: vi.fn(),
            };

            const initialData = {
                'ext-123': {
                    currentVersion: '2.0.0',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now() - 2000,
                            isRead: true,
                        },
                        {
                            version: '2.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: false,
                        },
                    ],
                },
            };
            storageAdapterMock.get.mockResolvedValue(initialData);

            const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
            await extensionsUpdateStorage.init();
            await extensionsUpdateStorage.markUpdateAsRead('ext-123');

            // Verify set was called with updated data
            expect(storageAdapterMock.set).toHaveBeenCalledWith(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
                expect.objectContaining({
                    'ext-123': expect.objectContaining({
                        updateHistory: expect.arrayContaining([
                            expect.objectContaining({
                                version: '2.0.0',
                                isRead: true,
                            }),
                        ]),
                    }),
                }),
            );
        });

        it('should mark a specific version as read when version is specified', async () => {
            const storageAdapterMock = {
                get: vi.fn(),
                set: vi.fn(),
            };

            const initialData = {
                'ext-123': {
                    currentVersion: '2.0.0',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now() - 2000,
                            isRead: false,
                        },
                        {
                            version: '2.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: false,
                        },
                    ],
                },
            };
            storageAdapterMock.get.mockResolvedValue(initialData);

            const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
            await extensionsUpdateStorage.init();
            await extensionsUpdateStorage.markUpdateAsRead('ext-123', '1.0.0');

            // Verify set was called with version 1.0.0 marked as read
            expect(storageAdapterMock.set).toHaveBeenCalledWith(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
                expect.objectContaining({
                    'ext-123': expect.objectContaining({
                        updateHistory: expect.arrayContaining([
                            expect.objectContaining({
                                version: '1.0.0',
                                isRead: true,
                            }),
                            expect.objectContaining({
                                version: '2.0.0',
                                isRead: false,
                            }),
                        ]),
                    }),
                }),
            );
        });

        it('should not update storage if update is already marked as read', async () => {
            const storageAdapterMock = {
                get: vi.fn(),
                set: vi.fn(),
            };

            const initialData = {
                'ext-123': {
                    currentVersion: '2.0.0',
                    updateHistory: [
                        {
                            version: '2.0.0',
                            detectedTimestampMs: Date.now(),
                            isRead: true,
                        },
                    ],
                },
            };
            storageAdapterMock.get.mockResolvedValue(initialData);

            const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
            await extensionsUpdateStorage.init();

            // Clear any calls from init
            storageAdapterMock.set.mockClear();

            await extensionsUpdateStorage.markUpdateAsRead('ext-123');

            // Should not call set since it's already marked as read
            expect(storageAdapterMock.set).not.toHaveBeenCalled();
        });

        it('should handle marking update as read for non-existent extension gracefully', async () => {
            const storageAdapterMock = {
                get: vi.fn(),
                set: vi.fn(),
            };

            storageAdapterMock.get.mockResolvedValue({});

            const extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapterMock);
            await extensionsUpdateStorage.init();

            // Clear any calls from init
            storageAdapterMock.set.mockClear();

            await extensionsUpdateStorage.markUpdateAsRead('non-existent');

            // Should not call set for non-existent extension
            expect(storageAdapterMock.set).not.toHaveBeenCalled();
        });
    });
});

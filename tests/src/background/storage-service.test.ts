/**
 * Tests for StorageService
 */

import * as v from 'valibot';
import {
    describe,
    it,
    expect,
    beforeEach,
    vi,
} from 'vitest';
import browser from 'webextension-polyfill';

import { StorageKey, storageService } from '../../../src/background/storage-service';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            local: {
                get: vi.fn(),
                set: vi.fn(),
                remove: vi.fn(),
            },
        },
    },
}));

describe('StorageService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('get', () => {
        it('should return stored data when valid', async () => {
            const key = new StorageKey('test_key', { value: 'default' }, v.object({ value: v.string() }));

            vi.mocked(browser.storage.local.get).mockResolvedValue({
                test_key: { value: 'hello' },
            });

            const result = await storageService.get(key);

            expect(result).toEqual({ value: 'hello' });
            expect(browser.storage.local.get).toHaveBeenCalledWith('test_key');
        });

        it('should return default value when key does not exist', async () => {
            const defaultValue = { count: 0 };
            const key = new StorageKey('missing_key', defaultValue);

            vi.mocked(browser.storage.local.get).mockResolvedValue({});

            const result = await storageService.get(key);

            expect(result).toEqual(defaultValue);
        });

        it('should return default value when validation fails', async () => {
            const defaultValue = { name: 'default' };
            const schema = v.object({ name: v.string(), age: v.number() });
            const key = new StorageKey('invalid_data', defaultValue, schema);

            // Missing required field 'age'
            vi.mocked(browser.storage.local.get).mockResolvedValue({
                invalid_data: { name: 'test' },
            });

            const result = await storageService.get(key);

            expect(result).toEqual(defaultValue);
        });

        it('should return default value when storage throws error', async () => {
            const defaultValue = { safe: true };
            const key = new StorageKey('error_key', defaultValue);

            vi.mocked(browser.storage.local.get).mockRejectedValue(new Error('Storage error'));

            const result = await storageService.get(key);

            expect(result).toEqual(defaultValue);
        });

        it('should work without schema validation', async () => {
            const key = new StorageKey('no_schema', { fallback: true });

            vi.mocked(browser.storage.local.get).mockResolvedValue({
                no_schema: { anything: 'goes' },
            });

            const result = await storageService.get(key);

            expect(result).toEqual({ anything: 'goes' });
        });
    });

    describe('set', () => {
        it('should write data to storage', async () => {
            const key = new StorageKey('write_key', {});
            const data = { message: 'test' };

            await storageService.set(key, data);

            expect(browser.storage.local.set).toHaveBeenCalledWith({
                write_key: data,
            });
        });

        it('should handle write errors gracefully', async () => {
            const key = new StorageKey('error_key', {});

            vi.mocked(browser.storage.local.set).mockRejectedValue(new Error('Write error'));

            // Should not throw
            await expect(storageService.set(key, { data: 'test' })).resolves.toBeUndefined();
        });
    });

    describe('remove', () => {
        it('should remove key from storage', async () => {
            const key = new StorageKey('remove_key', {});

            await storageService.remove(key);

            expect(browser.storage.local.remove).toHaveBeenCalledWith('remove_key');
        });

        it('should handle remove errors gracefully', async () => {
            const key = new StorageKey('error_key', {});

            vi.mocked(browser.storage.local.remove).mockRejectedValue(new Error('Remove error'));

            // Should not throw
            await expect(storageService.remove(key)).resolves.toBeUndefined();
        });
    });

    describe('StorageKey with complex schemas', () => {
        it('should validate nested objects', async () => {
            const schema = v.record(
                v.string(),
                v.object({
                    id: v.string(),
                    enabled: v.boolean(),
                    version: v.string(),
                }),
            );

            const defaultValue = {};
            const key = new StorageKey('extensions', defaultValue, schema);

            vi.mocked(browser.storage.local.get).mockResolvedValue({
                extensions: {
                    'ext-1': {
                        id: 'ext-1',
                        enabled: true,
                        version: '1.0.0',
                    },
                    'ext-2': {
                        id: 'ext-2',
                        enabled: false,
                        version: '2.0.0',
                    },
                },
            });

            const result = await storageService.get(key);

            expect(result).toEqual({
                'ext-1': { id: 'ext-1', enabled: true, version: '1.0.0' },
                'ext-2': { id: 'ext-2', enabled: false, version: '2.0.0' },
            });
        });
    });
});

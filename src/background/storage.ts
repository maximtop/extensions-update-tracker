import browser from 'webextension-polyfill';

/**
 * Simple wrapper around browser.storage.local API
 * Provides a simplified interface for storing and retrieving data in the browser's local storage
 */
class Storage {
    /**
     * Retrieves a value from local storage by key
     * @param key - The storage key to retrieve
     * @returns The stored value, or undefined if the key doesn't exist
     */
    async get(key: string) {
        const result = await browser.storage.local.get(key);
        return result[key];
    }

    /**
     * Stores a value in local storage under the specified key
     * @param key - The storage key to set
     * @param value - The value to store (must be JSON-serializable)
     * @returns A promise that resolves when the value is stored
     */
    async set(key: string, value: unknown) {
        return browser.storage.local.set({ [key]: value });
    }
}

/**
 * Singleton instance of the Storage class
 * Use this to interact with browser local storage throughout the extension
 */
export const storage = new Storage();

/**
 * Adapter interface for browser storage operations
 * Provides a thin abstraction layer over browser.storage.local API
 * to enable easier testing and potential future storage backend changes
 */
export interface StorageAdapter {
    /**
     * Retrieves a value from storage by key
     * @param key - The storage key to retrieve
     * @returns Promise resolving to the stored value, or undefined if not found
     */
    get: (key: string) => Promise<any>;

    /**
     * Stores a value in storage under the specified key
     * @param key - The storage key to store under
     * @param value - The value to store (will be JSON serialized)
     * @returns Promise that resolves when the value is stored
     */
    set: (key: string, value: any) => Promise<void>;
}

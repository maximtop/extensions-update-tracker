import { Management } from 'webextension-polyfill';

/**
 * Adapter interface for the storage service used by ExtensionsManagement.
 * This mirrors the approach taken with ManagementAdapter and allows tests
 * to inject a typed mock/fake without using `any`.
 */
export interface ExtensionsUpdateStorageAdapter {
    /**
     * Persist/update storage when an extension is installed (or detected for the first time).
     */
    saveInstalledInfo: (info: Management.ExtensionInfo) => Promise<void>;
}

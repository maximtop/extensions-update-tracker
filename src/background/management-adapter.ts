import browser from 'webextension-polyfill';

import type { Management } from 'webextension-polyfill';

/**
 * This is a type that adapts the browser.management API to the ManagementAdapter interface.
 * This is useful for testing the ExtensionsManagement class.
 */
export interface ManagementAdapter {
    onInstalled: {
        addListener: (callback: (info: Management.ExtensionInfo) => void) => void;
    };
    onUninstalled: {
        addListener: (callback: (info: Management.ExtensionInfo) => void) => void;
    };
    onDisabled: {
        addListener: (callback: (info: Management.ExtensionInfo) => void) => void;
    };
    getAll: () => Promise<Management.ExtensionInfo[]>;
    get: (id: string) => Promise<Management.ExtensionInfo>;
    setEnabled?: (id: string, enabled: boolean) => Promise<void>;
}

/**
 * This is an implementation of the ManagementAdapter interface that uses the browser.management API.
 */
export const managementAdapter: ManagementAdapter = {
    /**
     * This is the onInstalled event listener.
     */
    onInstalled: {
        /**
         * This is the addListener method.
         *
         * @param callback
         */
        addListener: (callback) => browser.management.onInstalled.addListener(callback),
    },

    /**
     * This is the onUninstalled event listener.
     */
    onUninstalled: {
        /**
         * This is the addListener method.
         *
         * @param callback
         */
        addListener: (callback) => browser.management.onUninstalled.addListener(callback),
    },

    /**
     * This is the onDisabled event listener.
     */
    onDisabled: {
        /**
         * This is the addListener method.
         *
         * @param callback
         */
        addListener: (callback) => browser.management.onDisabled.addListener(callback),
    },

    /**
     * Returns all installed extensions.
     */
    getAll: () => browser.management.getAll(),

    /**
     * Gets information about a specific extension by ID.
     *
     * @param id
     */
    get: (id: string) => browser.management.get(id),

    /**
     * Changes an extension's enabled state on Chromium browsers.
     *
     * @param id
     * @param enabled
     */
    setEnabled: (id, enabled) => browser.management.setEnabled(id, enabled),
};

/**
 * @file Adapts `browser.management` to the narrower `ManagementAdapter` interface, so
 * `ExtensionsManagement` can be tested against a fake implementation.
 */

import browser from 'webextension-polyfill';

import type { Management } from 'webextension-polyfill';

/**
 * Subset of the `browser.management` API that `ExtensionsManagement` depends on.
 * This is useful for testing the ExtensionsManagement class.
 */
export interface ManagementAdapter {
    /**
     * Fires when an extension is installed or updated.
     */
    onInstalled: {
        /**
         * Registers a listener for the event.
         */
        addListener: (callback: (info: Management.ExtensionInfo) => void) => void;
    };

    /**
     * Fires when an extension is uninstalled.
     */
    onUninstalled: {
        /**
         * Registers a listener for the event.
         */
        addListener: (callback: (info: Management.ExtensionInfo) => void) => void;
    };

    /**
     * Fires when an extension is disabled.
     */
    onDisabled: {
        /**
         * Registers a listener for the event.
         */
        addListener: (callback: (info: Management.ExtensionInfo) => void) => void;
    };

    /**
     * Returns every extension installed in the browser.
     */
    getAll: () => Promise<Management.ExtensionInfo[]>;

    /**
     * Returns information about a single installed extension.
     */
    get: (id: string) => Promise<Management.ExtensionInfo>;

    /**
     * Enables or disables an extension; unavailable on browsers that forbid this (e.g. Firefox).
     */
    setEnabled?: (id: string, enabled: boolean) => Promise<void>;
}

/**
 * `ManagementAdapter` implementation backed by the real `browser.management` API.
 */
export const managementAdapter: ManagementAdapter = {
    /**
     * Wraps `browser.management.onInstalled`.
     */
    onInstalled: {
        /**
         * Registers `callback` on `browser.management.onInstalled`.
         *
         * @param callback Invoked with the installed/updated extension's info.
         */
        addListener: (callback) => browser.management.onInstalled.addListener(callback),
    },

    /**
     * Wraps `browser.management.onUninstalled`.
     */
    onUninstalled: {
        /**
         * Registers `callback` on `browser.management.onUninstalled`.
         *
         * @param callback Invoked with the uninstalled extension's info.
         */
        addListener: (callback) => browser.management.onUninstalled.addListener(callback),
    },

    /**
     * Wraps `browser.management.onDisabled`.
     */
    onDisabled: {
        /**
         * Registers `callback` on `browser.management.onDisabled`.
         *
         * @param callback Invoked with the disabled extension's info.
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
     * @param id Extension id to look up.
     */
    get: (id: string) => browser.management.get(id),

    /**
     * Changes an extension's enabled state on Chromium browsers.
     *
     * @param id Extension id to change.
     * @param enabled Whether the extension should end up enabled.
     */
    setEnabled: (id, enabled) => browser.management.setEnabled(id, enabled),
};

/**
 * A stand-in for the extension APIs, injected into the page before the built
 * bundle runs.
 *
 * The screenshots render `dist/release/chrome/*.html` — the real production
 * bundle, not a mockup. What this module replaces is only the background
 * service worker behind it: the UI still talks over the same message protocol,
 * it just gets scripted answers instead of whatever extensions happen to be
 * installed on the machine taking the screenshots.
 */

import type { UserSettings } from '../../src/common/types/settings-types';
import type { ExtensionInfo, ExtensionsUpdateStorageType } from '../../src/common/update-storage';

/**
 * Everything the injected shim needs, passed as one serializable argument —
 * the function runs in the page and cannot reach anything in this module.
 */
export interface MockExtensionApiConfig {
    /** Raw `_locales/en/messages.json`, answered verbatim by `i18n.getMessage` */
    messages: Record<string, { message: string }>;
    storage: ExtensionsUpdateStorageType;
    extensionsInfo: Record<string, ExtensionInfo>;
    settings: UserSettings;
    /** Frozen timestamp reported as the last check */
    nowMs: number;
}

/**
 * Installs `globalThis.chrome` and `globalThis.browser`.
 *
 * webextension-polyfill hands `globalThis.browser` straight through when it
 * already carries a `runtime.id`, so the shim can be promise-based and skip
 * chrome's callback convention. `globalThis.chrome` still has to exist with an
 * id or the polyfill throws on import.
 *
 * Runs in the page: it may not reference anything outside its own body.
 */
export function installMockExtensionApi(config: MockExtensionApiConfig): void {
    const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

    const state = {
        storage: clone(config.storage),
        settings: clone(config.settings),
    };

    const markAll = (isRead: boolean): void => {
        for (const data of Object.values(state.storage)) {
            for (const entry of data.updateHistory) {
                entry.isRead = isRead;
            }
        }
    };

    const handle = (message: { type: string } & Record<string, any>): unknown => {
        switch (message.type) {
            case 'GetUpdates':
                return clone(state.storage);

            case 'GetExtensionsInfo': {
                const result: Record<string, unknown> = {};
                for (const id of message.extensionIds) {
                    if (config.extensionsInfo[id]) {
                        result[id] = config.extensionsInfo[id];
                    }
                }
                return result;
            }

            case 'GetSettings':
                return clone(state.settings);

            case 'UpdateSettings':
                state.settings = { ...state.settings, ...clone(message.settings) };
                return undefined;

            case 'SetExtensionMuted':
                state.settings.extensionPreferences.mutedExtensions[message.extensionId] = message.muted;
                return undefined;

            case 'MarkAllAsRead':
                markAll(true);
                return undefined;

            case 'MarkUpdateAsRead': {
                const data = state.storage[message.extensionId];
                for (const entry of data?.updateHistory ?? []) {
                    if (!message.version || entry.version === message.version) {
                        entry.isRead = true;
                    }
                }
                return undefined;
            }

            case 'MarkUpdatesAsUnread': {
                for (const item of message.items) {
                    const data = state.storage[item.extensionId];
                    for (const entry of data?.updateHistory ?? []) {
                        if (entry.version === item.version) {
                            entry.isRead = false;
                        }
                    }
                }
                return undefined;
            }

            case 'GetLastCheckedTimestamp':
                return config.nowMs;

            default:
                // ResetSettings, UpdatesPageOpened and SetLastCheckedTimestamp
                // have no effect worth showing in a screenshot
                return undefined;
        }
    };

    const noopEvent = {
        addListener: (): void => {},
        removeListener: (): void => {},
        hasListener: (): boolean => false,
    };

    const runtime = {
        id: 'store-assets-demo',
        getURL: (resourcePath: string): string => resourcePath,
        sendMessage: (message: { type: string }): Promise<unknown> => Promise.resolve(handle(message)),
        onMessage: noopEvent,
        getManifest: (): Record<string, unknown> => ({ version: '1.3.0' }),
    };

    const i18n = {
        getMessage: (key: string): string => config.messages[key]?.message ?? '',
        getUILanguage: (): string => 'en',
    };

    const local = new Map<string, unknown>();
    const storageArea = {
        get: (key?: string): Promise<Record<string, unknown>> => {
            if (typeof key !== 'string') {
                return Promise.resolve(Object.fromEntries(local));
            }
            return Promise.resolve(local.has(key) ? { [key]: local.get(key) } : {});
        },
        set: (items: Record<string, unknown>): Promise<void> => {
            for (const [key, value] of Object.entries(items)) {
                local.set(key, value);
            }
            return Promise.resolve();
        },
        remove: (key: string): Promise<void> => {
            local.delete(key);
            return Promise.resolve();
        },
    };

    const api = {
        runtime,
        i18n,
        storage: { local: storageArea, onChanged: noopEvent },
        tabs: { create: (): Promise<void> => Promise.resolve() },
        action: { setBadgeText: (): Promise<void> => Promise.resolve() },
    };

    Object.assign(globalThis, { chrome: api, browser: api });
}

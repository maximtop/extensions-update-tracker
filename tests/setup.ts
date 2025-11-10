import { vi } from 'vitest';

import { Logger, LogLevel } from '../src/common/utils/logger';

// Provide a minimal global mock for webextension-polyfill before any app imports
vi.mock('webextension-polyfill', () => {
    const mockBrowser = {
        i18n: {
            getMessage: (key: string, _subs?: string | string[]): string => key,
            getUILanguage: (): string => 'en',
        },
        storage: {
            local: {
                get: async (): Promise<Record<string, unknown>> => ({}),
                set: async (): Promise<void> => {},
                remove: async (): Promise<void> => {},
            },
        },
        browserAction: {
            setBadgeText: async (): Promise<void> => {},
            setBadgeBackgroundColor: async (): Promise<void> => {},
            setBadgeTextColor: async (): Promise<void> => {},
        },
        action: {
            setBadgeText: async (): Promise<void> => {},
            setBadgeBackgroundColor: async (): Promise<void> => {},
            setBadgeTextColor: async (): Promise<void> => {},
        },
        notifications: {
            create: async (): Promise<void> => {},
            clear: async (): Promise<void> => {},
            onButtonClicked: { addListener: (..._args: unknown[]): void => {} },
        },
        management: {
            onInstalled: { addListener: (..._args: unknown[]): void => {} },
            onUninstalled: { addListener: (..._args: unknown[]): void => {} },
            onDisabled: { addListener: (..._args: unknown[]): void => {} },
            getAll: async (): Promise<unknown[]> => [],
            get: async (): Promise<{ id: string; name: string; enabled: boolean; version: string }> => {
                return { id: '', name: '', enabled: true, version: '' };
            },
            setEnabled: async (): Promise<void> => {},
            uninstall: async (): Promise<void> => {},
        },
        runtime: {
            getURL: (path: string): string => `chrome-extension://test/${path}`,
        },
        // Add any additional APIs as needed by tests
    };
    return { default: mockBrowser };
});

// Reduce log noise in tests: only show warnings and errors
Logger.currentLevel = LogLevel.Error;

// Suppress console output during tests while keeping it spy-able for assertions
// Tests that spy on console.* will still capture calls, but nothing will print.
/* eslint-disable no-console */
console.error = vi.fn();
console.warn = vi.fn();
console.info = vi.fn();
console.debug = vi.fn();
console.trace = vi.fn();
console.groupCollapsed = vi.fn();
console.groupEnd = vi.fn();
/* eslint-enable no-console */

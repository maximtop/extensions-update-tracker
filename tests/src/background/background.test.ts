import { expect, it, vi } from 'vitest';

import { init } from '../../../src/background/background';

import type { Management, Notifications } from 'webextension-polyfill';

type ManagementListener = (info: Management.ExtensionInfo) => void | Promise<void>;

const runtime = vi.hoisted(() => {
    // Reload the background's dependencies with this runtime rather than the shared setup's browser mock.
    vi.resetModules();
    const fixture: Management.ExtensionInfo = {
        id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'Update fixture',
        description: 'An extension used to exercise lifecycle events',
        version: '1.0.6',
        enabled: true,
        mayDisable: true,
        type: 'extension',
        optionsUrl: '',
        installType: 'normal',
    };
    const data: Record<string, unknown> = {
        'user-settings': {
            notifications: { enabled: true, autoCloseTimeout: 0, soundEnabled: true },
            extensionPreferences: { mutedExtensions: {} },
            security: { autoDisableOnUpdate: false },
        },
        'extensions-update-storage': {
            [fixture.id]: {
                currentVersion: fixture.version,
                updateHistory: [{ version: fixture.version, detectedTimestampMs: 1, isRead: true }],
            },
        },
    };
    let releaseStorage: () => void;
    const storageReady = new Promise<void>((resolve) => {
        releaseStorage = resolve;
    });
    let releaseSnapshot: (extensions: Management.ExtensionInfo[]) => void;
    const installedSnapshot = new Promise<Management.ExtensionInfo[]>((resolve) => {
        releaseSnapshot = resolve;
    });
    const installedListeners = new Set<ManagementListener>();
    const uninstalledListeners = new Set<ManagementListener>();
    const disabledListeners = new Set<ManagementListener>();
    const notifications: Record<string, Notifications.CreateNotificationOptions> = {};
    const browser = {
        storage: {
            local: {
                get: vi.fn(async (key: string) => {
                    await storageReady;
                    return { [key]: structuredClone(data[key]) };
                }),
                set: vi.fn(async (values: Record<string, unknown>) => {
                    Object.assign(data, structuredClone(values));
                }),
                remove: vi.fn(async (key: string) => {
                    delete data[key];
                }),
            },
        },
        management: {
            onInstalled: { addListener: (listener: ManagementListener) => installedListeners.add(listener) },
            onUninstalled: { addListener: (listener: ManagementListener) => uninstalledListeners.add(listener) },
            onDisabled: { addListener: (listener: ManagementListener) => disabledListeners.add(listener) },
            getAll: vi.fn(() => installedSnapshot),
            get: vi.fn(async () => fixture),
        },
        action: {
            setBadgeText: vi.fn(async () => {}),
            setBadgeBackgroundColor: vi.fn(async () => {}),
            setBadgeTextColor: vi.fn(async () => {}),
        },
        notifications: {
            create: vi.fn(async (id: string, options: Notifications.CreateNotificationOptions) => {
                notifications[id] = options;
                return id;
            }),
            clear: vi.fn(async (id: string) => {
                delete notifications[id];
                return true;
            }),
            getAll: vi.fn(async () => notifications),
            onClicked: { addListener: vi.fn() },
            onButtonClicked: { addListener: vi.fn() },
            onClosed: { addListener: vi.fn() },
        },
        runtime: {
            getURL: (path: string) => `moz-extension://tracker/${path}`,
            onInstalled: { addListener: vi.fn() },
            onMessage: { addListener: vi.fn() },
        },
        i18n: {
            getUILanguage: () => 'en',
            getMessage: (key: string) => {
                if (key === 'notification_message') {
                    return '%name% updated from %old% to %new%';
                }
                return key;
            },
        },
    };
    return {
        fixture,
        data,
        browser,
        releaseStorage,
        releaseSnapshot,
        installedListeners,
        uninstalledListeners,
        disabledListeners,
    };
});

vi.mock('webextension-polyfill', () => ({ default: runtime.browser }));

it('handles persisted lifecycle events while startup storage and reconciliation are pending', async () => {
    init();

    // An event page can only be restarted by listeners registered in its first synchronous turn.
    const installed = [...runtime.installedListeners];
    const disabled = [...runtime.disabledListeners];
    const uninstalled = [...runtime.uninstalledListeners];
    runtime.releaseStorage();
    await vi.waitFor(() => expect(runtime.browser.management.getAll).toHaveBeenCalled());

    const updated = { ...runtime.fixture, version: '1.0.7' };
    const updateHandled = Promise.all(installed.map((listener) => listener(updated)));
    // The browser's startup snapshot predates an update delivered while that snapshot is loading.
    await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });
    expect(runtime.browser.notifications.create).not.toHaveBeenCalled();
    runtime.releaseSnapshot([runtime.fixture]);
    await updateHandled;

    await vi.waitFor(() => {
        expect(runtime.data['extensions-update-storage']).toEqual({
            [updated.id]: {
                currentVersion: '1.0.7',
                updateHistory: [
                    { version: '1.0.6', detectedTimestampMs: 1, isRead: true },
                    expect.objectContaining({ version: '1.0.7', previousVersion: '1.0.6' }),
                ],
            },
        });
        expect(runtime.browser.action.setBadgeText).toHaveBeenLastCalledWith({ text: '1' });
    });
    expect(runtime.browser.notifications.create).toHaveBeenCalledExactlyOnceWith(
        `extension-update-${updated.id}`,
        expect.objectContaining({ message: 'Update fixture updated from 1.0.6 to 1.0.7' }),
    );

    await Promise.all(disabled.map((listener) => listener({ ...updated, enabled: false })));
    expect(runtime.browser.notifications.clear).toHaveBeenCalledWith(`extension-update-${updated.id}`);
    expect(runtime.browser.notifications.create).toHaveBeenCalledTimes(2);

    await Promise.all(uninstalled.map((listener) => listener(updated)));
    expect(runtime.data['extensions-update-storage']).toEqual({});
    expect(runtime.browser.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
});

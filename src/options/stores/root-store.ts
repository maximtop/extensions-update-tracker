/**
 * @file Root MobX store: aggregates UpdatesStore and SettingsStore, and exposes them to
 * the React tree through context.
 */

import { makeAutoObservable } from 'mobx';
import React from 'react';

import { SettingsStore } from './settings-store';
import { UpdatesStore } from './updates-store';

/**
 * Aggregates the options page's MobX stores into a single observable root.
 */
export class RootStore {
    // Store instances
    updatesStore: UpdatesStore;

    settingsStore: SettingsStore;

    /**
     * Creates the child stores and makes the root observable.
     */
    constructor() {
        this.updatesStore = new UpdatesStore();
        this.settingsStore = new SettingsStore();
        makeAutoObservable(this);
    }
}

export const RootStoreContext = React.createContext<RootStore | null>(null);

/**
 * Reads the RootStore from context.
 *
 * @throws {Error} If called outside a `RootStoreContext.Provider`.
 */
export const useRootStore = () => {
    const context = React.useContext(RootStoreContext);
    if (context === null) {
        throw new Error('useRootStore must be used within a RootStoreProvider');
    }
    return context;
};

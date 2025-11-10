import { makeAutoObservable } from 'mobx';
import React from 'react';

import { SettingsStore } from './settings-store';
import { UpdatesStore } from './updates-store';

export class RootStore {
    // Store instances
    updatesStore: UpdatesStore;

    settingsStore: SettingsStore;

    constructor() {
        this.updatesStore = new UpdatesStore();
        this.settingsStore = new SettingsStore();
        makeAutoObservable(this);
    }
}

export const RootStoreContext = React.createContext<RootStore | null>(null);

export const useRootStore = () => {
    const context = React.useContext(RootStoreContext);
    if (context === null) {
        throw new Error('useRootStore must be used within a RootStoreProvider');
    }
    return context;
};

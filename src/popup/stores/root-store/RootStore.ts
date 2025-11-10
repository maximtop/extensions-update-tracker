import { createContext } from 'react';

import { PopupUpdatesStore } from '../popup-updates-store/PopupUpdatesStore';
import { SettingsStore } from '../settings-store';

export class RootStore {
    public settingsStore: SettingsStore;

    public popupUpdatesStore: PopupUpdatesStore;

    constructor() {
        this.settingsStore = new SettingsStore(this);
        this.popupUpdatesStore = new PopupUpdatesStore();
    }
}

export const RootStoreContext = createContext<RootStore>(null as unknown as RootStore);

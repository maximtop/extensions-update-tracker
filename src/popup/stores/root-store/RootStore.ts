/**
 * @file Root MobX store aggregating the popup's feature stores.
 */

import { createContext } from 'react';

import { PopupUpdatesStore } from '../popup-updates-store/PopupUpdatesStore';
import { SettingsStore } from '../settings-store';

/**
 * Aggregates the feature stores used by the popup UI and provides them via React context.
 */
export class RootStore {
    public settingsStore: SettingsStore;

    public popupUpdatesStore: PopupUpdatesStore;

    /**
     * Creates the feature stores owned by this root store.
     */
    constructor() {
        this.settingsStore = new SettingsStore(this);
        this.popupUpdatesStore = new PopupUpdatesStore();
    }
}

export const RootStoreContext = createContext<RootStore>(null as unknown as RootStore);

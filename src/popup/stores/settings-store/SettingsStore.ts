/**
 * @file MobX store for user settings, scoped under the root store.
 */

import { type RootStore } from '../root-store';

/**
 * Holds user settings state. Currently a placeholder that keeps a reference to the root store.
 */
export class SettingsStore {
    private rootStore: RootStore;

    /**
     * Creates the store.
     *
     * @param rootStore Root store this store belongs to.
     */
    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
    }
}

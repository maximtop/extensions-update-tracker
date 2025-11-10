import { type RootStore } from '../root-store';

export class SettingsStore {
    private rootStore: RootStore;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
    }
}

import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components/App';
import { RootStore, RootStoreContext } from './stores/root-store';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

export const popup = {
    init: () => {
        const container = document.getElementById('root');

        const root = createRoot(container);
        root.render(
            <RootStoreContext.Provider value={new RootStore()}>
                <App />
            </RootStoreContext.Provider>,
        );
    },
};

import React from 'react';
import { createRoot } from 'react-dom/client';

import { MessageSender } from '../common/messaging/message-sender';
import { t } from '../common/utils/i18n';

import { App } from './components/App';
import { RootStore, RootStoreContext } from './stores/root-store';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';

export const options = {
    init: () => {
        // Set localized document title
        document.title = t('options_page_document_title');

        // Notify background that options page was opened (to clear badge)
        MessageSender.notifyUpdatesPageOpened();

        const container = document.getElementById('root');

        const root = createRoot(container);

        root.render(
            <RootStoreContext.Provider value={new RootStore()}>
                <App />
            </RootStoreContext.Provider>,
        );
    },
};

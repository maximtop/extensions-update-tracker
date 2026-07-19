import { observer } from 'mobx-react-lite';
import React, { useState, useEffect } from 'react';

import { UpdateRef } from '../../common/messaging/message-types';
import { t, tPlural } from '../../common/utils/i18n';
import { useFilteredAndSortedExtensions } from '../hooks/useFilteredAndSortedExtensions';
import { useRootStore } from '../stores/root-store';
import { TAB_ABOUT, TAB_GENERAL, TAB_SETTINGS } from '../types/tab-types';
import { getSortOrderFromStorage, saveSortOrderToStorage } from '../utils/storage-utils';

import { AboutContent } from './AboutContent';
import { ExtensionsControls } from './ExtensionsControls';
import { ExtensionsList } from './ExtensionsList';
import { PageHeader } from './PageHeader';
import { SettingsContent } from './SettingsContent';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { LoadingState } from './states/LoadingState';
import { StatsBar } from './StatsBar';
import { TabNavigation } from './TabNavigation';
import { Toast } from './Toast';

/**
 * Main app component - orchestrates the options page layout
 */
export const App = observer(() => {
    const { updatesStore, settingsStore } = useRootStore();
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Component state is appropriate: sortOrder is persisted to localStorage (not chrome.storage),
    // making it page-specific UI preference rather than cross-component application state.
    // The useEffect pattern properly syncs state changes to localStorage.
    const [sortOrder, setSortOrder] = useState(() => getSortOrderFromStorage());
    // Undo state for the bulk mark-all-as-read action
    const [undoItems, setUndoItems] = useState<UpdateRef[] | null>(null);

    // Persist sort order changes to localStorage
    useEffect(() => {
        saveSortOrderToStorage(sortOrder);
    }, [sortOrder]);

    const sortedExtensionIds = useFilteredAndSortedExtensions({
        updatesStore,
        showUnreadOnly,
        searchQuery,
        sortOrder,
    });

    const isLoading = updatesStore.isLoading || settingsStore.isLoading;
    const hasError = updatesStore.error;
    const isEmpty = updatesStore.extensionIds.length === 0;

    // Mutually exclusive states rendered in priority order:
    // loading -> error -> tab content (with an empty state on the Updates tab)
    const renderTabPanel = () => {
        if (isLoading) {
            return <LoadingState />;
        }

        if (hasError) {
            return <ErrorState error={hasError} />;
        }

        switch (settingsStore.activeTab) {
            case TAB_SETTINGS:
                return (
                    <div role="tabpanel" id="settings-panel" aria-labelledby="settings-tab">
                        <SettingsContent />
                    </div>
                );

            case TAB_ABOUT:
                return (
                    <div role="tabpanel" id="about-panel" aria-labelledby="about-tab">
                        <AboutContent />
                    </div>
                );

            case TAB_GENERAL:
            default:
                if (isEmpty) {
                    return <EmptyState />;
                }
                return (
                    <div role="tabpanel" id="general-panel" aria-labelledby="general-tab">
                        <StatsBar
                            totalUpdateCount={updatesStore.totalUpdateCount}
                            unreadUpdateCount={updatesStore.unreadUpdateCount}
                            onMarkAllAsRead={async () => {
                                const snapshot = await updatesStore.markAllAsRead();
                                if (snapshot.length > 0) {
                                    setUndoItems(snapshot);
                                }
                            }}
                        />

                        <ExtensionsControls
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            showUnreadOnly={showUnreadOnly}
                            onToggleUnreadOnly={setShowUnreadOnly}
                            sortOrder={sortOrder}
                            onSortOrderChange={setSortOrder}
                        />

                        <ExtensionsList
                            extensionIds={sortedExtensionIds}
                            showUnreadOnly={showUnreadOnly}
                            searchQuery={searchQuery}
                            onClearSearch={() => setSearchQuery('')}
                            getUpdatesForExtension={(id) => updatesStore.getUpdatesForExtension(id)}
                        />
                    </div>
                );
        }
    };

    return (
        <>
            <header className="topnav">
                <div className="container topnav-inner">
                    <span className="brand-lockup">
                        <img alt="" src="assets/icons/icon-128.png" />
                        <span>{t('name')}</span>
                    </span>
                    <span className="tracker-status">{t('options_tracker_status')}</span>
                </div>
            </header>

            <main className="container">
                <div className="page-intro">
                    <PageHeader />
                    <TabNavigation
                        activeTab={settingsStore.activeTab}
                        onTabChange={(tab) => settingsStore.setActiveTab(tab)}
                    />
                </div>

                <div className="tab-panel">{renderTabPanel()}</div>
            </main>

            {undoItems && (
                <Toast
                    message={tPlural('options_toast_marked_read', undoItems.length)}
                    actionLabel={t('options_toast_undo')}
                    onAction={async () => {
                        await updatesStore.markUpdatesAsUnread(undoItems);
                        setUndoItems(null);
                    }}
                    onDismiss={() => setUndoItems(null)}
                />
            )}
        </>
    );
});

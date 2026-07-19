import { observer } from 'mobx-react-lite';
import React, { useState, useEffect } from 'react';

import { t } from '../../common/utils/i18n';
import { useFilteredAndSortedExtensions } from '../hooks/useFilteredAndSortedExtensions';
import { useRootStore } from '../stores/root-store';
import { TAB_GENERAL, TAB_SETTINGS } from '../types/tab-types';
import { getSortOrderFromStorage, saveSortOrderToStorage } from '../utils/storage-utils';

import { ExtensionsControls } from './ExtensionsControls';
import { ExtensionsList } from './ExtensionsList';
import { PageHeader } from './PageHeader';
import { SettingsContent } from './SettingsContent';
import { EmptyState } from './states/EmptyState';
import { ErrorState } from './states/ErrorState';
import { LoadingState } from './states/LoadingState';
import { StatsBar } from './StatsBar';
import { TabNavigation } from './TabNavigation';

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
    const isEmpty = !isLoading && !hasError && updatesStore.extensionIds.length === 0;

    // Main content - mutually exclusive states rendered in priority order
    // State priority: loading -> error -> empty -> loaded
    // This approach is simpler than a state machine for this use case
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

                <div className="tab-panel">
                    {isLoading && <LoadingState />}

                    {!isLoading && hasError && <ErrorState error={hasError} />}

                    {!isLoading && !hasError && isEmpty && settingsStore.activeTab === TAB_GENERAL && (
                        <EmptyState />
                    )}

                    {!isLoading && !hasError && !isEmpty && settingsStore.activeTab === TAB_GENERAL && (
                        <div role="tabpanel" id="general-panel" aria-labelledby="general-tab">
                            <StatsBar
                                totalUpdateCount={updatesStore.totalUpdateCount}
                                unreadUpdateCount={updatesStore.unreadUpdateCount}
                                onMarkAllAsRead={() => updatesStore.markAllAsRead()}
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
                    )}

                    {!isLoading && !hasError && settingsStore.activeTab === TAB_SETTINGS && (
                        <div role="tabpanel" id="settings-panel" aria-labelledby="settings-tab">
                            <SettingsContent />
                        </div>
                    )}
                </div>
            </main>
        </>
    );
});

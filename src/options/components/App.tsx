import { observer } from 'mobx-react-lite';
import React, { useState, useEffect } from 'react';

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
        sortOrder,
    });

    const isLoading = updatesStore.isLoading || settingsStore.isLoading;
    const hasError = updatesStore.error;
    const isEmpty = !isLoading && !hasError && updatesStore.extensionIds.length === 0;

    // Main content - mutually exclusive states rendered in priority order
    // State priority: loading -> error -> empty -> loaded
    // This approach is simpler than a state machine for this use case
    return (
        <div className="container">
            {isLoading && <LoadingState />}

            {!isLoading && hasError && <ErrorState error={hasError} />}

            {!isLoading && isEmpty && <EmptyState />}

            {!isLoading && !hasError && !isEmpty && (
                <>
                    <div className="header">
                        <PageHeader />
                        <TabNavigation
                            activeTab={settingsStore.activeTab}
                            onTabChange={(tab) => settingsStore.setActiveTab(tab)}
                        />
                    </div>

                    {settingsStore.activeTab === TAB_GENERAL && (
                        <div role="tabpanel" id="general-panel" aria-labelledby="general-tab">
                            <StatsBar
                                totalUpdateCount={updatesStore.totalUpdateCount}
                                unreadUpdateCount={updatesStore.unreadUpdateCount}
                            />

                            <ExtensionsControls
                                showUnreadOnly={showUnreadOnly}
                                onToggleUnreadOnly={setShowUnreadOnly}
                                hasUnreadUpdates={updatesStore.unreadUpdateCount > 0}
                                onMarkAllAsRead={() => updatesStore.markAllAsRead()}
                                sortOrder={sortOrder}
                                onSortOrderChange={setSortOrder}
                            />

                            <ExtensionsList
                                extensionIds={sortedExtensionIds}
                                showUnreadOnly={showUnreadOnly}
                                getUpdatesForExtension={(id) => updatesStore.getUpdatesForExtension(id)}
                            />
                        </div>
                    )}

                    {settingsStore.activeTab === TAB_SETTINGS && (
                        <div role="tabpanel" id="settings-panel" aria-labelledby="settings-tab">
                            <SettingsContent />
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

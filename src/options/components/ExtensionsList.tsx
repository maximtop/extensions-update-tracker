/**
 * @file Extension update ledger: renders one ExtensionCard per extension, or an empty state.
 */

import React from 'react';

import { t } from '../../common/utils/i18n';

import { ExtensionCard } from './ExtensionCard';

import type { ExtensionUpdate } from '../../common/update-storage';

/**
 * Props for ExtensionsList.
 */
interface ExtensionsListProps {
    /**
     * Ids of the extensions to render, already filtered and sorted.
     */
    extensionIds: string[];

    /**
     * Whether only unread updates are shown, used to pick the right empty-state copy.
     */
    showUnreadOnly: boolean;

    /**
     * Current search text, used to pick the right empty-state copy.
     */
    searchQuery: string;

    /**
     * Called when the user clears the search from the empty state.
     */
    onClearSearch: () => void;

    /**
     * Resolves the update history for a given extension id.
     */
    getUpdatesForExtension: (extensionId: string) => ExtensionUpdate[];
}

/**
 * Extension update ledger: one group per extension, separated by rules
 *
 * @param root0 Component props.
 * @param root0.extensionIds Ids of the extensions to render, already filtered and sorted.
 * @param root0.showUnreadOnly Whether only unread updates are shown, used to pick the right
 * empty-state copy.
 * @param root0.searchQuery Current search text, used to pick the right empty-state copy.
 * @param root0.onClearSearch Called when the user clears the search from the empty state.
 * @param root0.getUpdatesForExtension Resolves the update history for a given extension id.
 */
export function ExtensionsList({
    extensionIds,
    showUnreadOnly,
    searchQuery,
    onClearSearch,
    getUpdatesForExtension,
}: ExtensionsListProps): React.JSX.Element {
    if (extensionIds.length === 0) {
        const isSearchEmpty = searchQuery.trim().length > 0;
        return (
            <div className="empty-state">
                <div className="state-inner" role="status">
                    <h2>
                        {isSearchEmpty && t('options_empty_no_search_results')}
                        {!isSearchEmpty && (showUnreadOnly
                            ? t('options_empty_no_unread')
                            : t('options_empty_no_updates'))}
                    </h2>
                    {isSearchEmpty ? (
                        <button type="button" className="btn btn-secondary" onClick={onClearSearch}>
                            {t('options_clear_search')}
                        </button>
                    ) : (
                        !showUnreadOnly && <p>{t('options_empty_install_hint')}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="extensions-list">
            {extensionIds.map((extensionId) => (
                <ExtensionCard
                    key={extensionId}
                    extensionId={extensionId}
                    updates={getUpdatesForExtension(extensionId)}
                    showUnreadOnly={showUnreadOnly}
                />
            ))}
        </div>
    );
}

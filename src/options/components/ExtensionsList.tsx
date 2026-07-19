import React from 'react';

import { ExtensionUpdate } from '../../common/update-storage';
import { t } from '../../common/utils/i18n';

import { ExtensionCard } from './ExtensionCard';

interface ExtensionsListProps {
    extensionIds: string[];
    showUnreadOnly: boolean;
    searchQuery: string;
    onClearSearch: () => void;
    getUpdatesForExtension: (extensionId: string) => ExtensionUpdate[];
}

/**
 * Extension update ledger: one group per extension, separated by rules
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

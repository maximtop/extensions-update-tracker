import React from 'react';

import { ExtensionUpdate } from '../../common/update-storage';
import { t } from '../../common/utils/i18n';

import { ExtensionCard } from './ExtensionCard';

interface ExtensionsListProps {
    extensionIds: string[];
    showUnreadOnly: boolean;
    getUpdatesForExtension: (extensionId: string) => ExtensionUpdate[];
}

/**
 * List of extension cards with their updates
 */
export function ExtensionsList({
    extensionIds,
    showUnreadOnly,
    getUpdatesForExtension,
}: ExtensionsListProps): React.JSX.Element {
    if (extensionIds.length === 0) {
        return (
            <div className="alert alert-info text-center" role="alert">
                {showUnreadOnly ? t('options_empty_no_unread') : t('options_empty_no_updates')}
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
                />
            ))}
        </div>
    );
}

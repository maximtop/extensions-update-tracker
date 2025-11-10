import { useMemo } from 'react';

import { UpdatesStore } from '../stores/updates-store';
import { SORT_ORDER_ALPHABETICAL, SortOrder } from '../utils/storage-utils';

interface UseFilteredAndSortedExtensionsProps {
    updatesStore: UpdatesStore;
    showUnreadOnly: boolean;
    sortOrder: SortOrder;
}

/**
 * Custom hook to filter and sort extension IDs based on update status, date, and sort preference
 */
export function useFilteredAndSortedExtensions({
    updatesStore,
    showUnreadOnly,
    sortOrder,
}: UseFilteredAndSortedExtensionsProps): string[] {
    return useMemo(() => {
        const { extensionIds } = updatesStore;

        // Filter based on unread status
        const filteredIds = extensionIds.filter((id) => {
            if (!showUnreadOnly) {
                return true;
            }
            const updates = updatesStore.getUpdatesForExtension(id);
            return updates.some((u) => !u.isRead);
        });

        // Sort based on preference
        const sortedIds = [...filteredIds].sort((a, b) => {
            if (sortOrder === SORT_ORDER_ALPHABETICAL) {
                // Sort alphabetically by extension name
                const nameA = updatesStore.getExtensionInfo(a)?.name.toLowerCase() || '';
                const nameB = updatesStore.getExtensionInfo(b)?.name.toLowerCase() || '';
                return nameA.localeCompare(nameB);
            }
            // Sort by latest update date (most recent first)
            const updatesA = updatesStore.getUpdatesForExtension(a);
            const updatesB = updatesStore.getUpdatesForExtension(b);
            const latestA = updatesA[updatesA.length - 1]?.updateDate || '';
            const latestB = updatesB[updatesB.length - 1]?.updateDate || '';
            return latestB.localeCompare(latestA); // Descending
        });

        return sortedIds;
    }, [updatesStore, showUnreadOnly, sortOrder, updatesStore.extensionIds]);
}

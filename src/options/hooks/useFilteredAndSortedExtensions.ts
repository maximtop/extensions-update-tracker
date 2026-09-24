import { useMemo } from 'react';

import { SORT_ORDER_ALPHABETICAL } from '../utils/storage-utils';

import type { UpdatesStore } from '../stores/updates-store';
import type { SortOrder } from '../utils/storage-utils';

interface UseFilteredAndSortedExtensionsProps {
    updatesStore: UpdatesStore;
    showUnreadOnly: boolean;
    searchQuery: string;
    sortOrder: SortOrder;
}

/**
 * Custom hook to filter and sort extension IDs based on search query,
 * update status, and sort preference
 *
 * @param root0
 * @param root0.updatesStore
 * @param root0.showUnreadOnly
 * @param root0.searchQuery
 * @param root0.sortOrder
 */
export function useFilteredAndSortedExtensions({
    updatesStore,
    showUnreadOnly,
    searchQuery,
    sortOrder,
}: UseFilteredAndSortedExtensionsProps): string[] {
    const { extensionIds } = updatesStore;

    return useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();

        const filteredIds = extensionIds.filter((id) => {
            // Filter by extension name search query
            if (normalizedQuery) {
                const name = updatesStore.getExtensionInfo(id)?.name.toLowerCase() || '';
                if (!name.includes(normalizedQuery)) {
                    return false;
                }
            }

            // Filter based on unread status
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
    }, [updatesStore, extensionIds, showUnreadOnly, searchQuery, sortOrder]);
}

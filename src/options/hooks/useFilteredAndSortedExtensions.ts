/**
 * @file Hook that derives the filtered and sorted list of extension ids shown on the
 * Updates tab.
 */

import { useMemo } from 'react';

import { SORT_ORDER_ALPHABETICAL } from '../utils/storage-utils';

import type { UpdatesStore } from '../stores/updates-store';
import type { SortOrder } from '../utils/storage-utils';

/**
 * Props for useFilteredAndSortedExtensions.
 */
interface UseFilteredAndSortedExtensionsProps {
    /**
     * Store providing extension ids, per-extension info, and update history.
     */
    updatesStore: UpdatesStore;

    /**
     * When true, extensions with no unread updates are excluded.
     */
    showUnreadOnly: boolean;

    /**
     * Free-text query matched case-insensitively against the extension name.
     */
    searchQuery: string;

    /**
     * Preferred ordering of the result: by extension name or by latest update date.
     */
    sortOrder: SortOrder;
}

/**
 * Custom hook to filter and sort extension IDs based on search query,
 * update status, and sort preference
 *
 * @param root0 Hook props.
 * @param root0.updatesStore Store providing extension ids, per-extension info, and update
 * history.
 * @param root0.showUnreadOnly When true, extensions with no unread updates are excluded.
 * @param root0.searchQuery Free-text query matched case-insensitively against the extension
 * name.
 * @param root0.sortOrder Preferred ordering of the result: by extension name or by latest
 * update date.
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

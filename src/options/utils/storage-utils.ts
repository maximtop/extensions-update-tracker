/**
 * Local storage utilities for options page preferences
 */

export const SORT_ORDER_ALPHABETICAL = 'alphabetical' as const;
export const SORT_ORDER_RECENT = 'recent' as const;

export type SortOrder = typeof SORT_ORDER_ALPHABETICAL | typeof SORT_ORDER_RECENT;

const SORT_ORDER_STORAGE_KEY = 'options-page-sort-order';
const DEFAULT_SORT_ORDER: SortOrder = SORT_ORDER_RECENT;

/**
 * Get sort order preference from localStorage
 * Falls back to default if not set or invalid
 *
 * @returns The stored sort order or default
 */
/**
 * Type guard to check if a value is a valid SortOrder
 */
function isSortOrder(value: unknown): value is SortOrder {
    return value === SORT_ORDER_ALPHABETICAL || value === SORT_ORDER_RECENT;
}

export function getSortOrderFromStorage(): SortOrder {
    try {
        const stored = localStorage.getItem(SORT_ORDER_STORAGE_KEY);
        if (isSortOrder(stored)) {
            return stored;
        }
    } catch (error) {
        // Ignore localStorage errors (e.g., when disabled in browser settings)
    }
    return DEFAULT_SORT_ORDER;
}

/**
 * Save sort order preference to localStorage
 *
 * @param sortOrder - The sort order to persist
 */
export function saveSortOrderToStorage(sortOrder: SortOrder): void {
    try {
        localStorage.setItem(SORT_ORDER_STORAGE_KEY, sortOrder);
    } catch (error) {
        // Ignore localStorage errors (e.g., when disabled or quota exceeded)
    }
}

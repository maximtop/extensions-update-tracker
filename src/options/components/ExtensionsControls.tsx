/**
 * @file Control rail above the update ledger: search box, unread filter, and sort order.
 */

import React from 'react';

import { t } from '../../common/utils/i18n';
import { SORT_ORDER_ALPHABETICAL, SORT_ORDER_RECENT } from '../utils/storage-utils';

import type { SortOrder } from '../utils/storage-utils';

/**
 * Props for ExtensionsControls.
 */
interface ExtensionsControlsProps {
    /**
     * Current value of the search input.
     */
    searchQuery: string;

    /**
     * Called with the new search text on every keystroke.
     */
    onSearchQueryChange: (query: string) => void;

    /**
     * Whether the "Unread" filter segment is active.
     */
    showUnreadOnly: boolean;

    /**
     * Called when the user switches between the "All" and "Unread" filter segments.
     */
    onToggleUnreadOnly: (value: boolean) => void;

    /**
     * Currently selected sort order.
     */
    sortOrder: SortOrder;

    /**
     * Called when the user picks a different sort order.
     */
    onSortOrderChange: (order: SortOrder) => void;
}

/**
 * Control rail for the update ledger: search, All/Unread filter, and sort.
 *
 * @param root0 Component props.
 * @param root0.searchQuery Current value of the search input.
 * @param root0.onSearchQueryChange Called with the new search text on every keystroke.
 * @param root0.showUnreadOnly Whether the "Unread" filter segment is active.
 * @param root0.onToggleUnreadOnly Called when the user switches between the "All" and "Unread"
 * filter segments.
 * @param root0.sortOrder Currently selected sort order.
 * @param root0.onSortOrderChange Called when the user picks a different sort order.
 */
export function ExtensionsControls({
    searchQuery,
    onSearchQueryChange,
    showUnreadOnly,
    onToggleUnreadOnly,
    sortOrder,
    onSortOrderChange,
}: ExtensionsControlsProps): React.JSX.Element {
    return (
        <div className="control-rail">
            <div className="field">
                <label htmlFor="extension-search">{t('options_search_label')}</label>
                <input
                    className="input"
                    id="extension-search"
                    type="search"
                    placeholder={t('options_search_placeholder')}
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                />
            </div>

            <div className="field">
                <span className="field-label" id="filter-label">{t('options_filter_show')}</span>
                <div className="segments" role="group" aria-labelledby="filter-label">
                    <button
                        type="button"
                        className="segment"
                        aria-pressed={!showUnreadOnly}
                        onClick={() => onToggleUnreadOnly(false)}
                    >
                        {t('options_filter_all')}
                    </button>
                    <button
                        type="button"
                        className="segment"
                        aria-pressed={showUnreadOnly}
                        onClick={() => onToggleUnreadOnly(true)}
                    >
                        {t('options_filter_unread')}
                    </button>
                </div>
            </div>

            <div className="field">
                <label htmlFor="sortOrder">{t('options_controls_sort_by')}</label>
                <select
                    id="sortOrder"
                    className="select"
                    value={sortOrder}
                    onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
                >
                    <option value={SORT_ORDER_RECENT}>{t('options_controls_sort_recent')}</option>
                    <option value={SORT_ORDER_ALPHABETICAL}>{t('options_controls_sort_alphabetical')}</option>
                </select>
            </div>
        </div>
    );
}

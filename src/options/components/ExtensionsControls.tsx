import React from 'react';

import { t } from '../../common/utils/i18n';
import { SORT_ORDER_ALPHABETICAL, SORT_ORDER_RECENT, SortOrder } from '../utils/storage-utils';

interface ExtensionsControlsProps {
    searchQuery: string;
    onSearchQueryChange: (query: string) => void;
    showUnreadOnly: boolean;
    onToggleUnreadOnly: (value: boolean) => void;
    sortOrder: SortOrder;
    onSortOrderChange: (order: SortOrder) => void;
}

/**
 * Control rail for the update ledger: search, All/Unread filter, and sort.
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

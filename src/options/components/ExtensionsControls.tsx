import React from 'react';

import { t } from '../../common/utils/i18n';
import { SORT_ORDER_ALPHABETICAL, SORT_ORDER_RECENT, SortOrder } from '../utils/storage-utils';

interface ExtensionsControlsProps {
    showUnreadOnly: boolean;
    onToggleUnreadOnly: (value: boolean) => void;
    hasUnreadUpdates: boolean;
    onMarkAllAsRead: () => void;
    sortOrder: SortOrder;
    onSortOrderChange: (order: SortOrder) => void;
}

/**
 * Controls for filtering and managing extension updates
 */
export function ExtensionsControls({
    showUnreadOnly,
    onToggleUnreadOnly,
    hasUnreadUpdates,
    onMarkAllAsRead,
    sortOrder,
    onSortOrderChange,
}: ExtensionsControlsProps): React.JSX.Element {
    return (
        <div className="controls mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex gap-3 align-items-center">
                <div className="form-check">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="showUnreadOnly"
                        checked={showUnreadOnly}
                        onChange={(e) => onToggleUnreadOnly(e.target.checked)}
                    />
                    <label
                        className="form-check-label"
                        htmlFor="showUnreadOnly"
                    >
                        {t('options_controls_show_unread_only')}
                    </label>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <label htmlFor="sortOrder" className="form-label mb-0 small">
                        {t('options_controls_sort_by')}
                        :
                    </label>
                    <select
                        id="sortOrder"
                        className="form-select form-select-sm"
                        value={sortOrder}
                        onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
                        style={{ width: 'auto' }}
                    >
                        <option value={SORT_ORDER_RECENT}>{t('options_controls_sort_recent')}</option>
                        <option value={SORT_ORDER_ALPHABETICAL}>{t('options_controls_sort_alphabetical')}</option>
                    </select>
                </div>
            </div>

            {hasUnreadUpdates && (
                <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={onMarkAllAsRead}
                    data-testid="mark-all-read-button"
                >
                    {t('options_controls_mark_all_read')}
                </button>
            )}
        </div>
    );
}

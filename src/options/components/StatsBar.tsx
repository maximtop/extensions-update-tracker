import React from 'react';

import { t, tPlural } from '../../common/utils/i18n';

interface StatsBarProps {
    totalUpdateCount: number;
    unreadUpdateCount: number;
    onMarkAllAsRead: () => void;
}

/**
 * Activity summary rail: unread count as the leading value, total history as
 * supporting metadata, and the bulk mark-as-read action in the same zone.
 */
export function StatsBar({
    totalUpdateCount,
    unreadUpdateCount,
    onMarkAllAsRead,
}: StatsBarProps): JSX.Element {
    return (
        <div className="summary-rail" role="status" aria-live="polite">
            <div className="summary-copy">
                <span
                    className={`summary-num num ${unreadUpdateCount === 0 ? 'is-zero' : ''}`}
                    data-testid="unread-updates-count"
                    aria-label={tPlural('options_stats_unread_updates_aria', unreadUpdateCount)}
                >
                    {unreadUpdateCount}
                </span>
                <span className="summary-label">{tPlural('options_stats_unread_updates', unreadUpdateCount)}</span>
                <span className="summary-total">
                    <span
                        className="num"
                        data-testid="total-updates-count"
                        aria-label={tPlural('options_stats_total_updates_aria', totalUpdateCount)}
                    >
                        {totalUpdateCount}
                    </span>
                    {' '}
                    {t('options_stats_total_updates')}
                </span>
            </div>
            {unreadUpdateCount > 0 && (
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onMarkAllAsRead}
                    data-testid="mark-all-read-button"
                >
                    {t('options_controls_mark_all_read')}
                </button>
            )}
        </div>
    );
}

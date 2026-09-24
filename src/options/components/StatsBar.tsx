/**
 * @file Activity summary rail: unread/total update counts and the bulk mark-as-read action.
 */

import React from 'react';

import { t, tPlural } from '../../common/utils/i18n';

/**
 * Props for StatsBar.
 */
interface StatsBarProps {
    /**
     * Total number of updates recorded across all extensions.
     */
    totalUpdateCount: number;

    /**
     * Number of unread updates across all extensions.
     */
    unreadUpdateCount: number;

    /**
     * Called when the user activates the "mark all as read" button.
     */
    onMarkAllAsRead: () => void;
}

/**
 * Activity summary rail: unread count as the leading value, total history as
 * supporting metadata, and the bulk mark-as-read action in the same zone.
 *
 * @param root0 Component props.
 * @param root0.totalUpdateCount Total number of updates recorded across all extensions.
 * @param root0.unreadUpdateCount Number of unread updates across all extensions.
 * @param root0.onMarkAllAsRead Called when the user activates the "mark all as read" button.
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

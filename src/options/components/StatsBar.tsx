import React from 'react';

import { t } from '../../common/utils/i18n';

interface StatsBarProps {
    totalUpdateCount: number;
    unreadUpdateCount: number;
}

/**
 * Statistics bar displaying total and unread update counts
 */
export function StatsBar({ totalUpdateCount, unreadUpdateCount }: StatsBarProps): JSX.Element {
    return (
        <div className="stats-bar" role="status" aria-live="polite">
            <div className="d-flex gap-4 align-items-center">
                <div>
                    <span className="text-muted fw-medium">
                        {t('options_stats_total_updates')}
                        :
                        {' '}
                    </span>
                    <span
                        className="badge badge-secondary rounded-pill"
                        data-testid="total-updates-count"
                        aria-label={t('options_stats_total_updates_aria', totalUpdateCount.toString())}
                    >
                        {totalUpdateCount}
                    </span>
                </div>
                <div>
                    <span className="text-muted fw-medium">
                        {t('options_stats_unread_updates')}
                        :
                        {' '}
                    </span>
                    <span
                        className="badge badge-primary rounded-pill"
                        data-testid="unread-updates-count"
                        aria-label={t('options_stats_unread_updates_aria', unreadUpdateCount.toString())}
                    >
                        {unreadUpdateCount}
                    </span>
                </div>
            </div>
        </div>
    );
}

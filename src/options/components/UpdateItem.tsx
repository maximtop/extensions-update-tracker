import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import React from 'react';

import { ExtensionUpdate } from '../../common/update-storage';
import { formatTimeAgo, t } from '../../common/utils/i18n';
import { formatDate } from '../../common/utils/time';

interface UpdateItemProps {
    update: ExtensionUpdate;
}

export function UpdateItem({ update }: UpdateItemProps): React.JSX.Element {
    // Calculate how long ago the update was
    const getTimeAgo = (dateString: string) => {
        const updateDate = new Date(dateString);
        const now = new Date();

        const diffInMinutes = differenceInMinutes(now, updateDate);
        const diffInHours = differenceInHours(now, updateDate);
        const diffInDays = differenceInDays(now, updateDate);

        if (diffInMinutes < 1) {
            return t('options_update_item_just_now');
        }
        if (diffInMinutes < 60) {
            return formatTimeAgo(diffInMinutes, 'common_time_minute', 'common_time_minutes');
        }
        if (diffInHours < 24) {
            return formatTimeAgo(diffInHours, 'common_time_hour', 'common_time_hours');
        }
        return formatTimeAgo(diffInDays, 'common_time_day', 'common_time_days');
    };

    const getAriaLabel = () => {
        const timeAgo = getTimeAgo(update.updateDate);
        if (!update.isRead) {
            return t('options_update_item_aria_label_unread', [update.version, timeAgo]);
        }
        return t('options_update_item_aria_label_read', [update.version, timeAgo]);
    };

    return (
        <li
            className={`version-row ${!update.isRead ? 'unread' : ''}`}
            role="article"
            aria-label={getAriaLabel()}
        >
            <div className="version-main">
                <span className="version-number num">
                    {t('options_update_item_version')}
                    {' '}
                    {update.version}
                </span>
                {!update.isRead && (
                    <span
                        className="new-tag"
                        role="status"
                        aria-label={t('options_update_item_new_badge_aria')}
                    >
                        {t('options_update_item_new_badge')}
                    </span>
                )}
            </div>
            <span className="version-route">
                {update.previousVersion
                    ? `${update.previousVersion} → ${update.version}`
                    : ''}
            </span>
            <time
                className="version-date"
                dateTime={update.updateDate}
                title={formatDate(update.updateDate)}
            >
                {getTimeAgo(update.updateDate)}
            </time>

            {update.notes && (
                <div className="version-notes" role="note">
                    {update.notes}
                </div>
            )}
        </li>
    );
}

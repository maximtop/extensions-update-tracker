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
            return t('options-update-item-aria-label-unread', [update.version, timeAgo]);
        }
        return t('options-update-item-aria-label-read', [update.version, timeAgo]);
    };

    return (
        <li
            className={`update-item ${!update.isRead ? 'unread' : ''}`}
            role="article"
            aria-label={getAriaLabel()}
        >
            <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <span className="version">
                        {t('options_update_item_version')}
                        {' '}
                        {update.version}
                    </span>
                    {!update.isRead && (
                        <span
                            className="badge badge-primary rounded-pill ms-2"
                            role="status"
                            aria-label={t('options_update_item_new_badge_aria')}
                        >
                            {t('options_update_item_new_badge')}
                        </span>
                    )}
                </div>
                <time className="date" dateTime={update.updateDate} title={formatDate(update.updateDate)}>
                    {getTimeAgo(update.updateDate)}
                </time>
            </div>

            {update.notes && (
                <div className="notes mt-2" role="note">
                    {update.notes}
                </div>
            )}
        </li>
    );
}

/**
 * @file Single update-history row within an ExtensionCard.
 */

import React from 'react';

import { t } from '../../common/utils/i18n';
import { formatDate, formatTimeAgo } from '../../common/utils/time';
import { useRootStore } from '../stores/root-store';

import type { ExtensionUpdate } from '../../common/update-storage';

/**
 * Props for UpdateItem.
 */
interface UpdateItemProps {
    /**
     * The update to render.
     */
    update: ExtensionUpdate;
}

/**
 * One version row in an extension's update history: version, relative time,
 * an unread badge, a mark-as-read action, and release notes when present.
 *
 * @param root0 Component props.
 * @param root0.update The update to render.
 */
export function UpdateItem({ update }: UpdateItemProps): React.JSX.Element {
    const { updatesStore } = useRootStore();

    // Shared relative-time formatting (same wording as the popup)
    const getTimeAgo = (dateString: string) => formatTimeAgo(new Date(dateString).getTime());

    const getAriaLabel = () => {
        const timeAgo = getTimeAgo(update.updateDate);
        if (!update.isRead) {
            return t('options_update_item_aria_label_unread', { version: update.version, time_ago: timeAgo });
        }
        return t('options_update_item_aria_label_read', { version: update.version, time_ago: timeAgo });
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

            {!update.isRead && (
                <button
                    type="button"
                    className="mark-read-btn"
                    onClick={() => {
                        void updatesStore.markUpdateAsRead(update.extensionId, update.version);
                    }}
                >
                    {t('options_update_item_mark_read')}
                </button>
            )}

            {update.notes && (
                <div className="version-notes" role="note">
                    {update.notes}
                </div>
            )}
        </li>
    );
}

import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import { FallbackIcon } from '../../common/components/FallbackIcon';
import { ExtensionUpdate } from '../../common/update-storage';
import { t } from '../../common/utils/i18n';
import { useRootStore } from '../stores/root-store';

import { UpdateItem } from './UpdateItem';

interface ExtensionCardProps {
    extensionId: string;
    updates: ExtensionUpdate[];
    showUnreadOnly: boolean;
}

const MAX_VISIBLE_VERSIONS = 3;

export const ExtensionCard: React.FC<ExtensionCardProps> = observer(({ extensionId, updates, showUnreadOnly }) => {
    const { updatesStore, settingsStore } = useRootStore();
    const [isExpanded, setIsExpanded] = useState(true);
    // Component-local state is appropriate here: showAllVersions is pure UI state that
    // doesn't need to be shared between components or persisted. Using MobX would add
    // unnecessary complexity and coupling without providing benefits.
    const [showAllVersions, setShowAllVersions] = useState(false);

    // Get extension info from store
    const extensionInfo = updatesStore.getExtensionInfo(extensionId);
    const isMuted = settingsStore.isExtensionMuted(extensionId);

    // Count unread updates
    const unreadCount = updates.filter((update) => !update.isRead).length;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    if (!extensionInfo) {
        return null; // Don't render if we couldn't get extension info
    }

    // Sort updates by date (newest first); the unread filter narrows version rows too
    const sortedUpdates = [...updates]
        .filter((update) => !showUnreadOnly || !update.isRead)
        .sort((a, b) => new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime());

    const hasMoreVersions = sortedUpdates.length > MAX_VISIBLE_VERSIONS;
    const visibleUpdates = showAllVersions ? sortedUpdates : sortedUpdates.slice(0, MAX_VISIBLE_VERSIONS);

    // Get the icon URL from cached extension info
    // Icons are already fetched and cached by the store, this just selects the largest one
    const getIconUrl = () => {
        if (extensionInfo.icons && extensionInfo.icons.length > 0) {
            // Get the largest icon
            const largestIcon = extensionInfo.icons.reduce((prev, current) => {
                return prev.size > current.size ? prev : current;
            });
            return largestIcon.url;
        }
        return '';
    };

    const hasIcon = getIconUrl() !== '';

    // Aria label for the extension header
    const expandAction = isExpanded ? t('options_extension_card_collapse') : t('options_extension_card_expand');
    const updatesCountText = updates.length === 1
        ? t('options_extension_card_update_count_one')
        : t('options_extension_card_update_count', updates.length.toString());
    const unreadCountText = unreadCount === 1
        ? t('options_extension_card_unread_count_one')
        : t('options_extension_card_unread_count', unreadCount.toString());
    const updatesSummary = `${updatesCountText}, ${unreadCountText}`;
    const headerAriaLabel = t('options_extension_card_aria_label', [extensionInfo.name, updatesSummary, expandAction]);

    const muteLabel = isMuted ? t('options_settings_unmute_extension') : t('options_settings_mute_extension');
    const historyId = `history-${extensionId}`;

    return (
        <article className="extension-group">
            <div className="group-head">
                <button
                    type="button"
                    className="group-toggle"
                    onClick={toggleExpanded}
                    aria-expanded={isExpanded}
                    aria-controls={historyId}
                    aria-label={headerAriaLabel}
                >
                    <span className="record-icon">
                        {hasIcon ? (
                            <img src={getIconUrl()} alt="" width="32" height="32" />
                        ) : (
                            <FallbackIcon name={extensionInfo.name} />
                        )}
                    </span>
                    <span className="identity">
                        <span className="identity-line">
                            <h2 className="extension-name">{extensionInfo.name}</h2>
                            {extensionInfo.installType === 'development' && (
                                <span className="tag">{t('options_extension_card_local_badge')}</span>
                            )}
                            {unreadCount > 0 && (
                                <span className="tag">{unreadCountText}</span>
                            )}
                        </span>
                        <span className="identity-meta">
                            {isMuted
                                ? `${updatesCountText} · ${t('options_extension_card_muted')}`
                                : updatesCountText}
                        </span>
                    </span>
                </button>

                <div className="group-actions">
                    {extensionInfo.installType === 'normal' && (
                        <button
                            type="button"
                            className="icon-btn"
                            onClick={() => {
                                window.open(`https://chrome.google.com/webstore/detail/${extensionId}`, '_blank');
                            }}
                            title={t('options_update_item_view_web_store')}
                            aria-label={t('options_update_item_view_web_store')}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                aria-hidden="true"
                            >
                                <path d="M14 5h5v5M13 11l6-6M19 13v6H5V5h6" />
                            </svg>
                        </button>
                    )}
                    <button
                        type="button"
                        className={`icon-btn ${isMuted ? 'icon-btn-active' : ''}`}
                        onClick={() => settingsStore.toggleExtensionMuted(extensionId)}
                        title={muteLabel}
                        aria-label={muteLabel}
                        aria-pressed={isMuted}
                    >
                        {isMuted ? (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                aria-hidden="true"
                            >
                                <path
                                    d={'m3 3 18 18M10.7 5.1A6 6 0 0 1 18 11v1.8c.3 1.8 2 2.5 2 '
                                        + '4.2H8M6 8c0 7-3 7-3 9h2m5 4h4'}
                                />
                            </svg>
                        ) : (
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                aria-hidden="true"
                            >
                                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                            </svg>
                        )}
                    </button>
                    <button
                        type="button"
                        className="icon-btn"
                        onClick={toggleExpanded}
                        aria-expanded={isExpanded}
                        aria-controls={historyId}
                        aria-label={expandAction}
                    >
                        <svg
                            className={`chevron ${isExpanded ? 'expanded' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div id={historyId}>
                    <ol className="version-list">
                        {visibleUpdates.map((update) => (
                            <UpdateItem
                                key={`${update.extensionId}-${update.version}-${update.updateDate}`}
                                update={update}
                            />
                        ))}
                    </ol>
                    {hasMoreVersions && (
                        <button
                            type="button"
                            className="btn btn-ghost show-more"
                            onClick={() => setShowAllVersions(!showAllVersions)}
                        >
                            {showAllVersions
                                ? t('options_extension_card_show_less')
                                : t(
                                    'options_extension_card_show_more',
                                    (sortedUpdates.length - MAX_VISIBLE_VERSIONS).toString(),
                                )}
                        </button>
                    )}
                </div>
            )}
        </article>
    );
});

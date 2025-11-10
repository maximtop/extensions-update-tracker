import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import { ExtensionUpdate } from '../../common/update-storage';
import { t } from '../../common/utils/i18n';
import { useRootStore } from '../stores/root-store';

import { FallbackIcon } from './FallbackIcon';
import { UpdateItem } from './UpdateItem';

interface ExtensionCardProps {
    extensionId: string;
    updates: ExtensionUpdate[];
}

export const ExtensionCard: React.FC<ExtensionCardProps> = observer(({ extensionId, updates }) => {
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

    // Sort updates by date (newest first) and limit displayed versions to 3 by default
    const sortedUpdates = [...updates].sort((a, b) => {
        return new Date(b.updateDate).getTime() - new Date(a.updateDate).getTime();
    });

    const MAX_VISIBLE_VERSIONS = 3;
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
    const updatesCountText = t('options-extension-card-update-count', updates.length.toString());
    const unreadCountText = t('options-extension-card-unread-count', unreadCount.toString());
    const updatesSummary = `${updatesCountText}, ${unreadCountText}`;
    const headerAriaLabel = t('options-extension-card-aria-label', [extensionInfo.name, updatesSummary, expandAction]);

    // Chevron rotation style
    const chevronStyle = {
        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
    };

    // Chevron icon SVG path
    const chevronPath = 'M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 '
        + '01-1.414 0l-4-4a1 1 0 010-1.414z';

    return (
        <div className="extension-card">
            <div
                className="extension-header"
                role="button"
                onClick={toggleExpanded}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpanded();
                    }
                }}
                aria-expanded={isExpanded}
                aria-label={headerAriaLabel}
            >
                {hasIcon ? (
                    <img className="extension-icon" src={getIconUrl()} alt="" role="presentation" />
                ) : (
                    <FallbackIcon name={extensionInfo.name} />
                )}
                <h2 className="extension-name">
                    {extensionInfo.name}
                    {extensionInfo.installType === 'development' && (
                        <span className="badge bg-warning text-dark rounded-pill ms-2">
                            {t('options_extension_card_local_badge')}
                        </span>
                    )}
                    {unreadCount > 0 && (
                        <span className="badge badge-primary rounded-pill ms-2">{unreadCount}</span>
                    )}
                </h2>

                <div className="d-flex align-items-center gap-2">
                    {extensionInfo.installType === 'normal' && (
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-primary me-2"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://chrome.google.com/webstore/detail/${extensionId}`, '_blank');
                            }}
                        >
                            {t('options_update_item_view_web_store')}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`btn btn-sm ${isMuted ? 'btn-outline-warning' : 'btn-outline-secondary'}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            settingsStore.toggleExtensionMuted(extensionId);
                        }}
                        title={
                            isMuted ? t('options_settings_unmute_extension') : t('options_settings_mute_extension')
                        }
                        aria-label={
                            isMuted ? t('options_settings_unmute_extension') : t('options_settings_mute_extension')
                        }
                    >
                        {isMuted ? '🔕' : '🔔'}
                    </button>
                    <span className="badge badge-secondary rounded-pill">{updates.length}</span>
                    <svg
                        className="chevron-icon"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        style={chevronStyle}
                    >
                        <path fillRule="evenodd" d={chevronPath} clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <>
                    <ul className="extension-updates">
                        {visibleUpdates.map((update) => (
                            <UpdateItem
                                key={`${update.extensionId}-${update.version}-${update.updateDate}`}
                                update={update}
                            />
                        ))}
                    </ul>
                    {hasMoreVersions && (
                        <div className="text-center mt-2 mb-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-link"
                                onClick={() => setShowAllVersions(!showAllVersions)}
                            >
                                {showAllVersions
                                    ? t('options_extension_card_show_less')
                                    : t(
                                        'options_extension_card_show_more',
                                        (updates.length - MAX_VISIBLE_VERSIONS).toString(),
                                    )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

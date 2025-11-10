import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import { t } from '../../../common/utils/i18n';
import { formatTimeAgo } from '../../../common/utils/time';
import { RootStoreContext } from '../../stores/root-store';

import './App.css';

function AppComponent() {
    const { popupUpdatesStore } = useContext(RootStoreContext);
    const {
        unreadCount,
        updateCount,
        latestUnread,
        lastChecked,
        isLoading,
        error,
    } = popupUpdatesStore;

    const handleViewUpdates = () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('options.html'),
        });
    };

    const handleMarkAllAsRead = async () => {
        await popupUpdatesStore.markAllAsRead();
    };

    if (error) {
        return (
            <div className="container">
                <h1>{t('popup_app_title')}</h1>
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="container">
                <h1>{t('popup_app_title')}</h1>
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <h1>{t('popup_app_title')}</h1>

            {unreadCount === 0 ? (
                // All caught up state
                <div className="caught-up-message">
                    <div className="caught-up-icon">✓</div>
                    <div className="caught-up-text">{t('popup_app_all_caught_up')}</div>
                    {lastChecked && (
                        <div className="caught-up-time">
                            {t('popup_app_last_checked')}
                            :
                            {' '}
                            {formatTimeAgo(lastChecked)}
                        </div>
                    )}
                </div>
            ) : (
                // Has unread updates
                <>
                    <div className="text-center mb-4">
                        <div className="stats-container">
                            <div
                                className="stat-box"
                                onClick={unreadCount === 1 ? handleViewUpdates : undefined}
                                onKeyDown={unreadCount === 1 ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleViewUpdates();
                                    }
                                } : undefined}
                                role="button"
                                tabIndex={unreadCount === 1 ? 0 : -1}
                                style={{ cursor: unreadCount === 1 ? 'pointer' : 'default' }}
                            >
                                <div className="stat-label">{t('popup_app_unread_updates')}</div>
                                <div className="stat-value">
                                    <span className="badge badge-primary rounded-pill">{unreadCount}</span>
                                </div>
                            </div>
                            <div className="stat-box">
                                <div className="stat-label">{t('popup_app_total_updates')}</div>
                                <div className="stat-value">
                                    <span className="badge bg-info rounded-pill">{updateCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Show preview of latest unread update */}
                    {latestUnread && (
                        <div className="update-preview">
                            <div className="update-preview-header">
                                {latestUnread.icon ? (
                                    <img
                                        src={latestUnread.icon}
                                        alt=""
                                        className="update-preview-icon"
                                    />
                                ) : (
                                    <svg
                                        className="update-preview-icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <rect width="24" height="24" rx="4" fill="#6c757d" />
                                        <text
                                            x="12"
                                            y="17"
                                            textAnchor="middle"
                                            fill="white"
                                            fontSize="14"
                                            fontWeight="600"
                                            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                                        >
                                            {latestUnread.extensionName.charAt(0).toUpperCase()}
                                        </text>
                                    </svg>
                                )}
                                <div className="update-preview-name">{latestUnread.extensionName}</div>
                            </div>
                            <div className="update-preview-version">
                                {latestUnread.previousVersion
                                    ? `v${latestUnread.previousVersion} → v${latestUnread.version}`
                                    : `v${latestUnread.version}`}
                            </div>
                            <div className="update-preview-time">
                                {formatTimeAgo(latestUnread.timestamp)}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="d-grid gap-2 mb-3">
                <button
                    onClick={handleViewUpdates}
                    type="button"
                    className="btn btn-primary"
                >
                    {unreadCount === 1 ? t('popup_app_view_new_update') : t('popup_app_view_all_updates')}
                </button>

                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        type="button"
                        className={unreadCount < 3 ? 'btn-link-style' : 'btn btn-outline-primary'}
                    >
                        {t('popup_app_mark_all_read')}
                    </button>
                )}
            </div>

            {lastChecked && unreadCount > 0 && (
                <div className="last-checked">
                    <svg className="last-checked-icon" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                    </svg>
                    {t('popup_app_last_checked')}
                    :
                    {' '}
                    {formatTimeAgo(lastChecked)}
                </div>
            )}
        </div>
    );
}

export const App = observer(AppComponent);

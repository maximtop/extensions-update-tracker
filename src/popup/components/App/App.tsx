import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import { FallbackIcon } from '../../../common/components/FallbackIcon';
import { t, tPlural } from '../../../common/utils/i18n';
import { formatDate, formatTimeAgo } from '../../../common/utils/time';
import { MAX_VISIBLE_UNREAD } from '../../stores/popup-updates-store/PopupUpdatesStore';
import { RootStoreContext } from '../../stores/root-store';

import './App.css';

function AppComponent() {
    const { popupUpdatesStore } = useContext(RootStoreContext);
    const {
        unreadCount,
        updateCount,
        recentUnread,
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

    const handleRetry = () => {
        popupUpdatesStore.loadUpdateCounts();
    };

    const hasUnread = !isLoading && !error && unreadCount > 0;
    const isCaughtUp = !isLoading && !error && unreadCount === 0;

    return (
        <div className="container popup-shell">
            <header className="row brand">
                <img className="brand-mark" src="assets/icons/icon-128.png" alt="" />
                <div>
                    <h1>{t('popup_app_title')}</h1>
                    {lastChecked !== null && (
                        <p className="meta">
                            {`${t('popup_app_last_checked')}: ${formatTimeAgo(lastChecked)}`}
                        </p>
                    )}
                </div>
            </header>

            {error && (
                <div className="state-panel" role="alert">
                    <div className="state-panel-inner">
                        <span className="state-icon danger" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v6m0 4h.01" />
                            </svg>
                        </span>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {!error && isLoading && (
                <div className="state-panel" role="status" aria-busy="true">
                    <div className="state-panel-inner">
                        <div className="loading-preview" aria-hidden="true">
                            <span className="loading-preview-icon" />
                            <span className="loading-preview-lines">
                                <span />
                                <span />
                            </span>
                        </div>
                        <span className="sr-only">{t('options_loading')}</span>
                    </div>
                </div>
            )}

            {isCaughtUp && (
                <div className="state-panel">
                    <div className="state-panel-inner" role="status" aria-live="polite">
                        <span className="state-icon success" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m5 12 4 4L19 6" />
                            </svg>
                        </span>
                        <h2>{t('popup_app_all_caught_up')}</h2>
                        <p>{t('popup_app_caught_up_desc')}</p>
                        {lastChecked !== null && (
                            <p className="meta">
                                {`${t('popup_app_last_checked')}: ${formatTimeAgo(lastChecked)}`}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {hasUnread && (
                <>
                    <div className="status-block">
                        <p className="status-kicker">{t('popup_app_since_last_review')}</p>
                        <div className="status-line">
                            <span className="status-count num">{unreadCount}</span>
                            <span className="status-label">
                                {tPlural('popup_app_unread_updates', unreadCount)}
                            </span>
                        </div>
                        <p className="status-total">
                            <strong>{updateCount}</strong>
                            {' '}
                            {tPlural('popup_app_total_recorded', updateCount)}
                        </p>
                    </div>

                    <div className="latest-list">
                        {recentUnread.map((unread) => (
                            <button
                                key={`${unread.extensionId}-${unread.version}`}
                                type="button"
                                className="latest"
                                onClick={handleViewUpdates}
                            >
                                <span className="latest-top">
                                    <span className="record-icon">
                                        {unread.icon ? (
                                            <img src={unread.icon} alt="" width="28" height="28" />
                                        ) : (
                                            <FallbackIcon name={unread.extensionName} />
                                        )}
                                    </span>
                                    <strong className="latest-name">{unread.extensionName}</strong>
                                    <span
                                        className="latest-time"
                                        title={formatDate(new Date(unread.timestamp).toISOString())}
                                    >
                                        {formatTimeAgo(unread.timestamp)}
                                    </span>
                                    <svg
                                        className="latest-chevron"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        aria-hidden="true"
                                    >
                                        <path d="m9 6 6 6-6 6" />
                                    </svg>
                                </span>
                                <span className="version-route num">
                                    {unread.previousVersion
                                        ? `${unread.previousVersion} → ${unread.version}`
                                        : unread.version}
                                </span>
                            </button>
                        ))}
                    </div>

                    {unreadCount > MAX_VISIBLE_UNREAD && (
                        <button type="button" className="more-updates" onClick={handleViewUpdates}>
                            {tPlural('popup_app_more_updates', unreadCount - MAX_VISIBLE_UNREAD)}
                        </button>
                    )}
                </>
            )}

            {error ? (
                <div className="actions">
                    <button type="button" className="btn btn-secondary" onClick={handleRetry}>
                        {t('popup_app_retry')}
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleViewUpdates}>
                        {t('popup_app_open_history')}
                    </button>
                </div>
            ) : (
                <div className="actions">
                    {isCaughtUp && (
                        <button type="button" className="btn btn-secondary" onClick={handleViewUpdates}>
                            {t('popup_app_open_history')}
                        </button>
                    )}
                    {hasUnread && (
                        <>
                            <button type="button" className="btn btn-primary" onClick={handleViewUpdates}>
                                {tPlural('popup_app_view_updates', unreadCount)}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={handleMarkAllAsRead}>
                                {t('popup_app_mark_all_read')}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export const App = observer(AppComponent);

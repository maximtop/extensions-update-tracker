import React from 'react';

import { t } from '../../common/utils/i18n';
import {
    OptionsTab,
    TAB_ABOUT,
    TAB_GENERAL,
    TAB_SETTINGS,
} from '../types/tab-types';

interface TabNavigationProps {
    activeTab: OptionsTab;
    onTabChange: (tab: OptionsTab) => void;
}

/**
 * Tab navigation component for switching between Updates and Settings views
 */
export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps): React.JSX.Element {
    return (
        <nav>
            <div className="tab-navigation" role="tablist">
                <button
                    type="button"
                    id="general-tab"
                    role="tab"
                    aria-selected={activeTab === TAB_GENERAL}
                    aria-controls="general-panel"
                    className={`tab-button ${activeTab === TAB_GENERAL ? 'active' : ''}`}
                    onClick={() => onTabChange(TAB_GENERAL)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M4 7h16M4 12h16M4 17h10" />
                    </svg>
                    {t('options_tab_general')}
                </button>
                <button
                    type="button"
                    id="settings-tab"
                    role="tab"
                    aria-selected={activeTab === TAB_SETTINGS}
                    aria-controls="settings-panel"
                    className={`tab-button ${activeTab === TAB_SETTINGS ? 'active' : ''}`}
                    onClick={() => onTabChange(TAB_SETTINGS)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="3" />
                        <path
                            d={'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 '
                                + '1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 '
                                + '17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 '
                                + '1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 '
                                + '3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 '
                                + '0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z'}
                        />
                    </svg>
                    {t('options_tab_settings')}
                </button>
                <button
                    type="button"
                    id="about-tab"
                    role="tab"
                    aria-selected={activeTab === TAB_ABOUT}
                    aria-controls="about-panel"
                    className={`tab-button ${activeTab === TAB_ABOUT ? 'active' : ''}`}
                    onClick={() => onTabChange(TAB_ABOUT)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path strokeLinecap="round" d="M12 11.2v4.6" />
                        <circle cx="12" cy="8" r="0.4" fill="currentColor" />
                    </svg>
                    {t('options_tab_about')}
                </button>
            </div>
        </nav>
    );
}

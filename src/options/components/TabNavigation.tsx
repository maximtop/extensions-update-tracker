import React from 'react';

import { t } from '../../common/utils/i18n';
import { OptionsTab, TAB_GENERAL, TAB_SETTINGS } from '../types/tab-types';

interface TabNavigationProps {
    activeTab: OptionsTab;
    onTabChange: (tab: OptionsTab) => void;
}

/**
 * Tab navigation component for switching between General and Settings views
 */
export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps): React.JSX.Element {
    return (
        <nav className="tab-navigation">
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === TAB_GENERAL}
                aria-controls="general-panel"
                className={`tab-button ${activeTab === TAB_GENERAL ? 'active' : ''}`}
                onClick={() => onTabChange(TAB_GENERAL)}
            >
                {t('options_tab_general')}
            </button>
            <button
                type="button"
                role="tab"
                aria-selected={activeTab === TAB_SETTINGS}
                aria-controls="settings-panel"
                className={`tab-button ${activeTab === TAB_SETTINGS ? 'active' : ''}`}
                onClick={() => onTabChange(TAB_SETTINGS)}
            >
                ⚙️
                {' '}
                {t('options_tab_settings')}
            </button>
        </nav>
    );
}

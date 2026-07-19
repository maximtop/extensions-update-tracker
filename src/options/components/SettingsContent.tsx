import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import { t } from '../../common/utils/i18n';
import { useRootStore } from '../stores/root-store';

import { ConfirmDialog } from './ConfirmDialog';

interface SwitchRowProps {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}

/**
 * A single settings switch row: whole row is the control, per the design's
 * switch-list pattern (row click, pointer, and keyboard all toggle).
 */
function SwitchRow({
    id,
    title,
    description,
    checked,
    disabled,
    onToggle,
}: SwitchRowProps): React.JSX.Element {
    return (
        <button
            type="button"
            id={id}
            className="switch-row"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={onToggle}
        >
            <span>
                <span className="switch-title">{title}</span>
                <span className="switch-description">{description}</span>
            </span>
            <span className="switch-control" aria-hidden="true" />
        </button>
    );
}

/**
 * Settings content component
 * Contains all settings sections: notifications, security, and reset
 */
export const SettingsContent: React.FC = observer(() => {
    const { settingsStore } = useRootStore();
    const { settings } = settingsStore;
    const [showResetDialog, setShowResetDialog] = useState(false);

    const handleReset = () => {
        setShowResetDialog(true);
    };

    const handleConfirmReset = () => {
        settingsStore.resetSettings();
        setShowResetDialog(false);
    };

    const handleCancelReset = () => {
        setShowResetDialog(false);
    };

    return (
        <>
            {/* Notification Settings */}
            <section className="settings-section">
                <h2>{t('options_settings_section_notifications')}</h2>

                <div className="switch-list">
                    <SwitchRow
                        id="enableNotifications"
                        title={t('options_settings_enable_notifications')}
                        description={t('options_settings_enable_notifications_desc')}
                        checked={settings.notifications.enabled}
                        disabled={false}
                        onToggle={() => settingsStore.toggleNotifications()}
                    />
                    <SwitchRow
                        id="notificationSound"
                        title={t('options_settings_notification_sound')}
                        description={t('options_settings_notification_sound_desc')}
                        checked={settings.notifications.soundEnabled}
                        disabled={!settings.notifications.enabled}
                        onToggle={() => settingsStore.toggleNotificationSound()}
                    />
                </div>
            </section>

            {/* Security Settings */}
            <section className="settings-section">
                <h2>{t('options_settings_section_security')}</h2>

                <div className="switch-list">
                    <SwitchRow
                        id="autoDisableOnUpdate"
                        title={t('options_settings_auto_disable_on_update')}
                        description={t('options_settings_auto_disable_on_update_desc')}
                        checked={settings.security.autoDisableOnUpdate}
                        disabled={false}
                        onToggle={() => settingsStore.toggleAutoDisableOnUpdate()}
                    />
                </div>
            </section>

            {/* Reset Section */}
            <section className="settings-section">
                <h2>{t('options_settings_section_reset')}</h2>
                <p className="settings-section-desc">{t('options_settings_reset_desc')}</p>
                <button type="button" className="btn btn-danger reset-action" onClick={handleReset}>
                    {t('options_settings_reset_button')}
                </button>
            </section>

            {/* Reset Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showResetDialog}
                title={t('options_settings_reset_dialog_title')}
                message={t('options_settings_reset_confirm')}
                confirmText={t('options_settings_reset_dialog_confirm')}
                cancelText={t('options_settings_reset_dialog_cancel')}
                onConfirm={handleConfirmReset}
                onCancel={handleCancelReset}
            />
        </>
    );
});

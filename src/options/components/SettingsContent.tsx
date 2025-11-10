import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import { t } from '../../common/utils/i18n';
import { useRootStore } from '../stores/root-store';

import { ConfirmDialog } from './ConfirmDialog';

/**
 * Settings content component
 * Contains all settings sections: notifications, security, and experimental
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
            <section className="mb-4">
                <h6 className="border-bottom pb-2 mb-3">{t('options_settings_section_notifications')}</h6>

                <div className="form-check form-switch mb-3">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="enableNotifications"
                        checked={settings.notifications.enabled}
                        onChange={() => settingsStore.toggleNotifications()}
                    />
                    <label className="form-check-label" htmlFor="enableNotifications">
                        <div>{t('options_settings_enable_notifications')}</div>
                        <small className="text-muted">{t('options_settings_enable_notifications_desc')}</small>
                    </label>
                </div>

                <div className="form-check form-switch mb-3">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="notificationSound"
                        checked={settings.notifications.soundEnabled}
                        onChange={() => settingsStore.toggleNotificationSound()}
                    />
                    <label className="form-check-label" htmlFor="notificationSound">
                        <div>{t('options_settings_notification_sound')}</div>
                        <small className="text-muted">{t('options_settings_notification_sound_desc')}</small>
                    </label>
                </div>
            </section>

            {/* Security Settings */}
            <section className="mb-4">
                <h6 className="border-bottom pb-2 mb-3">{t('options_settings_section_security')}</h6>

                <div className="form-check form-switch mb-3">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="autoDisableOnUpdate"
                        checked={settings.security.autoDisableOnUpdate}
                        onChange={() => settingsStore.toggleAutoDisableOnUpdate()}
                    />
                    <label className="form-check-label" htmlFor="autoDisableOnUpdate">
                        <div>{t('options_settings_auto_disable_on_update')}</div>
                        <small className="text-muted">{t('options_settings_auto_disable_on_update_desc')}</small>
                    </label>
                </div>
            </section>

            {/* Note about per-extension mute controls */}
            <section className="mb-4" />

            {/* Reset Button */}
            <div className="d-grid">
                <button type="button" className="btn btn-outline-danger" onClick={handleReset}>
                    {t('options_settings_reset_button')}
                </button>
            </div>

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

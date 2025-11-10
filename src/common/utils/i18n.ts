import browser from 'webextension-polyfill';

/**
 * Get a translated message from the browser's i18n system
 * @param messageName The name of the message key in messages.json
 * @param substitutions Optional substitutions for placeholders
 * @returns The translated message
 */
export function t(messageName: string, substitutions?: string | string[]): string {
    return browser.i18n.getMessage(messageName, substitutions);
}

/**
 * Get the current UI language
 * @returns The current language code (e.g., 'en', 'zh_CN', 'es')
 */
export function getUILanguage(): string {
    return browser.i18n.getUILanguage();
}

/**
 * Helper function to format time ago strings with proper pluralization
 * @param value The numeric value
 * @param singularKey The message key for singular form
 * @param pluralKey The message key for plural form
 * @returns Formatted time string
 */
export function formatTimeAgo(value: number, singularKey: string, pluralKey: string): string {
    const unit = value === 1 ? t(singularKey) : t(pluralKey);
    return `${value} ${unit} ${t('common_time_ago')}`;
}

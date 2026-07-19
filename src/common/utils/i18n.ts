import { translate, type I18nInterface, type Locale } from '@adguard/translate';
import browser from 'webextension-polyfill';

const BASE_LOCALE: Locale = 'en';

/**
 * Locales bundled with the extension (folders in src/_locales),
 * in @adguard/translate notation: lowercase with underscore separators
 */
const SUPPORTED_LOCALES: Locale[] = ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'pt_br', 'ru', 'zh_cn'];

/**
 * Resolves the browser UI language (BCP 47, e.g. "pt-BR") to the bundled locale
 * chrome.i18n actually serves messages from, so plural form selection matches
 * the language of the loaded messages
 *
 * @returns Locale code supported by @adguard/translate
 */
function resolveLocale(): Locale {
    const normalized = browser.i18n.getUILanguage().toLowerCase().replace('-', '_') as Locale;
    if (SUPPORTED_LOCALES.includes(normalized)) {
        return normalized;
    }
    const language = normalized.split('_')[0] as Locale;
    if (SUPPORTED_LOCALES.includes(language)) {
        return language;
    }
    return BASE_LOCALE;
}

const i18nInterface: I18nInterface = {
    getMessage: (key: string) => browser.i18n.getMessage(key),
    getUILanguage: resolveLocale,
    // chrome.i18n falls back to the default locale on its own,
    // so base-locale lookups go through the same call
    getBaseMessage: (key: string) => browser.i18n.getMessage(key),
    getBaseUILanguage: () => BASE_LOCALE,
};

const translator = translate.createTranslator(i18nInterface);

/**
 * Values substituted into `%placeholder%` markers of a message
 */
export type TranslationParams = Record<string, string | number>;

/**
 * Get a translated message, substituting `%placeholder%` parameters
 *
 * @param key The message key in messages.json
 * @param params Optional named values for `%placeholder%` markers
 * @returns The translated message
 */
export function t(key: string, params?: TranslationParams): string {
    return translator.getMessage(key, params);
}

/**
 * Get the plural form of a translated message for the given number.
 * Message forms are separated with `|`; the number is available as `%count%`
 *
 * @param key The message key in messages.json
 * @param count The number selecting the plural form
 * @param params Optional named values for additional `%placeholder%` markers
 * @returns The translated message in the correct plural form
 */
export function tPlural(key: string, count: number, params?: TranslationParams): string {
    return translator.getPlural(key, count, params);
}

/**
 * Get the current UI language
 * @returns The current language code (e.g., 'en', 'zh_CN', 'es')
 */
export function getUILanguage(): string {
    return browser.i18n.getUILanguage();
}

/**
 * Tests the real translation pipeline end to end: actual @adguard/translate,
 * actual strings from src/_locales, no t() mocks. Guards against broken
 * placeholder substitution (e.g. a literal "%name%" leaking into a
 * notification) and wrong plural form selection per locale.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    describe,
    it,
    expect,
    beforeAll,
    afterEach,
} from 'vitest';
import browser from 'webextension-polyfill';

import { t, tPlural } from '../../../src/common/utils/i18n';
import { formatTimeAgo } from '../../../src/common/utils/time';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(currentDir, '../../../src/_locales');

type Messages = Record<string, { message: string }>;

const loadLocale = (dir: string): Messages => {
    const file = path.join(LOCALES_DIR, dir, 'messages.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
};

// Mutable state driving the browser.i18n stub below
let activeMessages: Messages = loadLocale('en');
let activeUiLanguage = 'en';

const useLocale = (dir: string, uiLanguage: string) => {
    activeMessages = loadLocale(dir);
    activeUiLanguage = uiLanguage;
};

beforeAll(() => {
    // Replace the key-echoing stub from tests/setup.ts with one serving
    // the real locale files, so the full translate pipeline is exercised
    browser.i18n.getMessage = ((key: string): string => activeMessages[key]?.message ?? '') as never;
    browser.i18n.getUILanguage = ((): string => activeUiLanguage) as never;
});

const minutesAgo = (m: number) => Date.now() - m * 60 * 1000;

afterEach(() => {
    useLocale('en', 'en');
});

describe('real i18n pipeline', () => {
    describe('notification messages (en)', () => {
        it('substitutes update notification placeholders', () => {
            expect(t('notification_message', { name: 'AdBlock', old: '1.0.0', new: '1.0.1' }))
                .toBe('AdBlock updated from 1.0.0 to 1.0.1');
        });

        it('substitutes first-install notification placeholders', () => {
            expect(t('notification_message_first_install', { name: 'AdBlock', version: '2.0.0' }))
                .toBe('AdBlock installed (version 2.0.0)');
        });

        it('substitutes aria label placeholders', () => {
            expect(t('options_update_item_aria_label_unread', { version: '1.2.3', time_ago: '5 minutes ago' }))
                .toBe('Version 1.2.3, unread, updated 5 minutes ago');
        });
    });

    describe('plural forms (en)', () => {
        it('selects singular and plural forms', () => {
            expect(tPlural('options_extension_card_update_count', 1)).toBe('1 update');
            expect(tPlural('options_extension_card_update_count', 5)).toBe('5 updates');
            expect(tPlural('options_extension_card_update_count', 0)).toBe('0 updates');
        });

        it('formats relative time', () => {
            expect(formatTimeAgo(minutesAgo(0))).toBe('just now');
            expect(formatTimeAgo(minutesAgo(1))).toBe('1 minute ago');
            expect(formatTimeAgo(minutesAgo(5))).toBe('5 minutes ago');
            expect(formatTimeAgo(minutesAgo(61))).toBe('1 hour ago');
            expect(formatTimeAgo(minutesAgo(3 * 24 * 60))).toBe('3 days ago');
        });

        it('resolves regional UI language to a bundled locale', () => {
            useLocale('en', 'en-US');
            expect(tPlural('options_extension_card_update_count', 2)).toBe('2 updates');
        });
    });

    describe('plural forms (ru, 4 forms)', () => {
        it('selects one/few/many forms', () => {
            useLocale('ru', 'ru');
            expect(tPlural('options_extension_card_update_count', 1)).toBe('1 обновление');
            expect(tPlural('options_extension_card_update_count', 2)).toBe('2 обновления');
            expect(tPlural('options_extension_card_update_count', 5)).toBe('5 обновлений');
            expect(tPlural('options_extension_card_update_count', 21)).toBe('21 обновление');
        });

        it('formats relative time with russian declensions', () => {
            useLocale('ru', 'ru');
            expect(formatTimeAgo(minutesAgo(0))).toBe('только что');
            expect(formatTimeAgo(minutesAgo(1))).toBe('1 минуту назад');
            expect(formatTimeAgo(minutesAgo(2))).toBe('2 минуты назад');
            expect(formatTimeAgo(minutesAgo(5))).toBe('5 минут назад');
            expect(formatTimeAgo(minutesAgo(61))).toBe('1 час назад');
            expect(formatTimeAgo(minutesAgo(2 * 60))).toBe('2 часа назад');
        });

        it('substitutes notification placeholders', () => {
            useLocale('ru', 'ru');
            expect(t('notification_message', { name: 'AdBlock', old: '1.0.0', new: '1.0.1' }))
                .toBe('AdBlock обновлено с 1.0.0 на 1.0.1');
        });
    });

    describe('plural forms (ja, single form)', () => {
        it('uses the same form for any count', () => {
            useLocale('ja', 'ja');
            expect(tPlural('options_extension_card_update_count', 1)).toBe('1件の更新');
            expect(tPlural('options_extension_card_update_count', 7)).toBe('7件の更新');
        });
    });
});

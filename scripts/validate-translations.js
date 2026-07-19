#!/usr/bin/env node
/* eslint-disable no-continue */

/**
 * Translation Validation Script
 *
 * This script validates that all locale files have complete translations
 * and no redundant keys before building a release.
 *
 * Usage: node scripts/validate-translations.js
 * Exit codes:
 *   0 - All translations valid
 *   1 - Validation errors found
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { validator } from '@adguard/translate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/_locales');
const BASE_LOCALE = 'en';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};

function log(message, color = '') {
    console.log(`${color}${message}${colors.reset}`);
}

function readMessagesFile(locale) {
    const filePath = path.join(LOCALES_DIR, locale, 'messages.json');

    if (!fs.existsSync(filePath)) {
        throw new Error(`Messages file not found for locale: ${locale}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(`Invalid JSON in ${locale}/messages.json: ${error.message}`);
    }
}

function getMessageKeys(messages) {
    return Object.keys(messages).filter((key) => {
        // Only count actual translation keys, not nested properties
        return messages[key] && typeof messages[key] === 'object' && messages[key].message;
    }).sort();
}

/**
 * Maps a locale directory name (e.g. "pt_BR") to the @adguard/translate
 * locale code (lowercase, e.g. "pt_br").
 */
function toLibLocale(locale) {
    return locale.toLowerCase();
}

/**
 * Checks a translated message against the base (en) message with the
 * @adguard/translate validator: placeholder parity and, for plural strings,
 * the correct number of |-separated forms for the locale.
 *
 * @returns Error description string, or null if the message is valid
 */
function getMessageError(baseMessage, translatedMessage, locale, key) {
    try {
        if (!validator.isTranslationValid(baseMessage, translatedMessage, toLibLocale(locale))) {
            return `${key}: placeholders or plural structure do not match base locale`;
        }
        return null;
    } catch (error) {
        return `${key}: ${error.message}`;
    }
}

function validateTranslations() {
    log('\n🌐 Validating Translations...\n', colors.bold + colors.cyan);

    // Get all locale directories
    const locales = fs.readdirSync(LOCALES_DIR)
        .filter((item) => {
            const itemPath = path.join(LOCALES_DIR, item);
            return fs.statSync(itemPath).isDirectory();
        })
        .sort();

    if (!locales.includes(BASE_LOCALE)) {
        log(`❌ Reference locale '${BASE_LOCALE}' not found!`, colors.red);
        return false;
    }

    log(`📋 Found ${locales.length} locales: ${locales.join(', ')}\n`, colors.blue);

    // Read reference locale
    let referenceMessages;
    try {
        referenceMessages = readMessagesFile(BASE_LOCALE);
    } catch (error) {
        log(`❌ ${error.message}`, colors.red);
        return false;
    }

    const referenceKeys = getMessageKeys(referenceMessages);

    // Self-check the reference locale: catches plural strings with a wrong
    // number of forms or broken placeholder markers in en itself
    const referenceErrors = referenceKeys
        .map((key) => getMessageError(
            referenceMessages[key].message,
            referenceMessages[key].message,
            BASE_LOCALE,
            key,
        ))
        .filter((error) => error !== null);

    if (referenceErrors.length > 0) {
        log(`❌ Reference locale (${BASE_LOCALE}) has invalid messages:`, colors.red);
        referenceErrors.forEach((error) => log(`   - ${error}`, colors.yellow));
        return false;
    }

    log(`✓ Reference locale (${BASE_LOCALE}) has ${referenceKeys.length} keys\n`, colors.green);

    let hasErrors = false;
    const results = [];

    // Validate each locale
    for (const locale of locales) {
        if (locale === BASE_LOCALE) {
            continue;
        }

        let messages;
        try {
            messages = readMessagesFile(locale);
        } catch (error) {
            log(`❌ ${error.message}`, colors.red);
            hasErrors = true;
            continue;
        }

        const keys = getMessageKeys(messages);
        const missingKeys = referenceKeys.filter((key) => !keys.includes(key));
        const extraKeys = keys.filter((key) => !referenceKeys.includes(key));

        const invalidMessages = keys
            .filter((key) => referenceKeys.includes(key))
            .map((key) => getMessageError(
                referenceMessages[key].message,
                messages[key].message,
                locale,
                key,
            ))
            .filter((error) => error !== null);

        if (missingKeys.length === 0 && extraKeys.length === 0 && invalidMessages.length === 0) {
            results.push({
                locale,
                status: 'success',
                keyCount: keys.length,
            });
        } else {
            hasErrors = true;
            results.push({
                locale,
                status: 'error',
                keyCount: keys.length,
                missingKeys,
                extraKeys,
                invalidMessages,
            });
        }
    }

    // Print results
    log('═══════════════════════════════════════════════════\n', colors.cyan);

    for (const result of results) {
        if (result.status === 'success') {
            log(`✅ ${result.locale.padEnd(10)} [${result.keyCount}/${referenceKeys.length}] Complete`, colors.green);
        } else {
            log(`❌ ${result.locale.padEnd(10)} [${result.keyCount}/${referenceKeys.length}] Issues found`, colors.red);

            if (result.missingKeys.length > 0) {
                log(`   Missing ${result.missingKeys.length} key(s):`, colors.yellow);
                result.missingKeys.forEach((key) => {
                    log(`     - ${key}`, colors.yellow);
                });
            }

            if (result.extraKeys.length > 0) {
                log(`   Extra ${result.extraKeys.length} key(s) (should be removed):`, colors.yellow);
                result.extraKeys.forEach((key) => {
                    log(`     - ${key}`, colors.yellow);
                });
            }

            if (result.invalidMessages.length > 0) {
                log(`   Invalid ${result.invalidMessages.length} message(s):`, colors.yellow);
                result.invalidMessages.forEach((error) => {
                    log(`     - ${error}`, colors.yellow);
                });
            }
            log('');
        }
    }

    log('\n═══════════════════════════════════════════════════\n', colors.cyan);

    if (hasErrors) {
        log('❌ Translation validation FAILED', colors.bold + colors.red);
        log('   Please fix the issues above before building a release.\n', colors.red);
        return false;
    }
        log('✅ All translations are complete and valid!', colors.bold + colors.green);
        log(`   ${locales.length} locales with ${referenceKeys.length} keys each\n`, colors.green);
        return true;
}

// Run validation
const isValid = validateTranslations();
process.exit(isValid ? 0 : 1);

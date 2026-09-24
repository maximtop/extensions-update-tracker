/**
 * @file Identifies which browser the current build targets.
 */

/**
 * Browser targets produced by the release build.
 */
export type BrowserTarget = 'chrome' | 'edge' | 'firefox';

declare const TARGET_BROWSER: BrowserTarget;

/**
 * Browser selected by the build, defaulting to Chrome in unit tests.
 */
export const CURRENT_BROWSER: BrowserTarget = typeof TARGET_BROWSER === 'undefined'
    ? 'chrome'
    : TARGET_BROWSER;

/**
 * Whether this build runs on Firefox.
 */
export const IS_FIREFOX = CURRENT_BROWSER === 'firefox';

/**
 * Firefox cannot enable or disable ordinary extensions through management.setEnabled.
 */
export const SUPPORTS_EXTENSION_STATE_CHANGES = !IS_FIREFOX;

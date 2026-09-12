/** Browser targets produced by the release build. */
export type BrowserTarget = 'chrome' | 'edge' | 'firefox';

declare const __TARGET_BROWSER__: BrowserTarget;

/** Browser selected by the build, defaulting to Chrome in unit tests. */
export const CURRENT_BROWSER: BrowserTarget = typeof __TARGET_BROWSER__ === 'undefined'
    ? 'chrome'
    : __TARGET_BROWSER__;

/** Whether this build runs on Firefox. */
export const IS_FIREFOX = CURRENT_BROWSER === 'firefox';

/** Firefox cannot enable or disable ordinary extensions through management.setEnabled. */
export const SUPPORTS_EXTENSION_STATE_CHANGES = !IS_FIREFOX;

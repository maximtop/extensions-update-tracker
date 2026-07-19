/**
 * Options page tab types and constants
 */

/**
 * Available tabs in the options page
 */
export type OptionsTab = 'general' | 'settings' | 'about';

/**
 * Tab identifier constants
 */
export const TAB_GENERAL: OptionsTab = 'general';
export const TAB_SETTINGS: OptionsTab = 'settings';
export const TAB_ABOUT: OptionsTab = 'about';

/**
 * Default active tab
 */
export const DEFAULT_TAB: OptionsTab = TAB_GENERAL;

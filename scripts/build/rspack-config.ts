/**
 * @file Builds the Rspack configuration for a target browser.
 */

import { type Configuration } from '@rspack/core';

import { Browser } from './constants';
import { getBrowserConf } from './helpers';
import { genCommonConfig } from './rspack.common';

/**
 * Builds the Rspack configuration for a target browser.
 *
 * @param browser Browser to build the configuration for.
 *
 * @returns The Rspack configuration for `browser`.
 *
 * @throws When `browser` is not one of the known {@link Browser} values.
 */
export const getRspackConfig = (browser: Browser): Configuration => {
    switch (browser) {
        case Browser.Chrome: {
            return genCommonConfig(getBrowserConf(browser));
        }
        case Browser.Edge: {
            return genCommonConfig(getBrowserConf(browser));
        }
        case Browser.Firefox: {
            return genCommonConfig(getBrowserConf(browser));
        }
        default: {
            throw new Error(`Unknown browser: "${String(browser)}"`);
        }
    }
};

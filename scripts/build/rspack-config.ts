import { type Configuration } from '@rspack/core';

import { Browser } from './constants';
import { getBrowserConf } from './helpers';
import { genCommonConfig } from './rspack.common';

export const getRspackConfig = (browser: Browser): Configuration => {
    switch (browser) {
        case Browser.Chrome: {
            return genCommonConfig(getBrowserConf(browser));
        }
        default: {
            throw new Error(`Unknown browser: "${browser}"`);
        }
    }
};

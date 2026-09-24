import { BROWSERS_CONF, ENV_CONF } from './constants';

import type {
    Browser,
    BrowserConfig,
    BuildTargetEnv,
    EnvConfig,
} from './constants';

export const getBrowserConf = (browser: Browser): BrowserConfig => {
    const browserConf = BROWSERS_CONF[browser];
    if (!browserConf) {
        throw new Error(`No browser config for: "${browser}"`);
    }
    return browserConf;
};

export const getEnvConf = (env: BuildTargetEnv): EnvConfig => {
    const envConfig = ENV_CONF[env];
    if (!envConfig) {
        throw new Error(`No env config for: "${env}"`);
    }
    return envConfig;
};

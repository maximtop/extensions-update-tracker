/**
 * @file Lookup helpers for the build/browser config maps in `./constants`.
 */

import { BROWSERS_CONF, ENV_CONF } from './constants';

import type {
    Browser,
    BrowserConfig,
    BuildTargetEnv,
    EnvConfig,
} from './constants';

/**
 * Looks up the build config for a browser.
 *
 * @param browser Browser to look up.
 *
 * @returns The browser's build config.
 *
 * @throws When `browser` has no entry in `BROWSERS_CONF`.
 */
export const getBrowserConf = (browser: Browser): BrowserConfig => {
    const browserConf = BROWSERS_CONF[browser];
    if (!browserConf) {
        throw new Error(`No browser config for: "${browser}"`);
    }
    return browserConf;
};

/**
 * Looks up the build config for a target environment.
 *
 * @param env Target environment to look up.
 *
 * @returns The environment's build config.
 *
 * @throws When `env` has no entry in `ENV_CONF`.
 */
export const getEnvConf = (env: BuildTargetEnv): EnvConfig => {
    const envConfig = ENV_CONF[env];
    if (!envConfig) {
        throw new Error(`No env config for: "${env}"`);
    }
    return envConfig;
};

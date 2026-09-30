/**
 * @file Build-time constants: target environments, supported browsers, and their configs.
 */

import path from 'path';

export enum BuildTargetEnv {
    Dev = 'dev',
    Beta = 'beta',
    Release = 'release',
    Test = 'test',
}

/**
 * Checks whether a raw string (e.g. from an environment variable) is a known {@link BuildTargetEnv}.
 *
 * @param buildEnv Value to check.
 *
 * @returns True when `buildEnv` matches one of the `BuildTargetEnv` values.
 */
const isValidBuildEnv = (buildEnv: string): buildEnv is BuildTargetEnv => {
    return Object.values(BuildTargetEnv).includes(buildEnv as BuildTargetEnv);
};

const buildEnv = process.env.BUILD_ENV || BuildTargetEnv.Dev;

if (!isValidBuildEnv(buildEnv)) {
    throw new Error(`Invalid BUILD_ENV: ${buildEnv}`);
}

export const BUILD_ENV: BuildTargetEnv = buildEnv;

/**
 * Per-environment build settings.
 */
export interface EnvConfig {
    /**
     * Directory name under the dist folder that this environment's build is written to.
     */
    outputPath: string;

    /**
     * Rspack mode to build with.
     */
    mode: 'development' | 'production';
}

export const ENV_CONF: Record<BuildTargetEnv, EnvConfig> = {
    [BuildTargetEnv.Dev]: {
        outputPath: 'dev',
        mode: 'development',
    },
    [BuildTargetEnv.Beta]: {
        outputPath: 'beta',
        mode: 'production',
    },
    [BuildTargetEnv.Release]: {
        outputPath: 'release',
        mode: 'production',
    },
    [BuildTargetEnv.Test]: {
        outputPath: 'test',
        mode: 'development',
    },
};

export const enum Browser {
    Chrome = 'chrome',
    Edge = 'edge',
    Firefox = 'firefox',
}

export const BUILD_PATH = path.resolve(import.meta.dirname, '../../dist');

/**
 * Per-browser build settings.
 */
export interface BrowserConfig {
    /**
     * Browser this config applies to.
     */
    browser: Browser;

    /**
     * Whether to bundle the extension's devtools panel for this browser.
     */
    devtools: boolean;

    /**
     * Directory name (relative to `BUILD_PATH/<env>`) that this browser's build is written to.
     */
    buildDir: string;
}

export const BROWSERS_CONF: Record<Browser, BrowserConfig> = {
    [Browser.Chrome]: {
        browser: Browser.Chrome,
        devtools: true,
        buildDir: Browser.Chrome,
    },
    [Browser.Edge]: {
        browser: Browser.Edge,
        devtools: true,
        buildDir: Browser.Edge,
    },
    [Browser.Firefox]: {
        browser: Browser.Firefox,
        devtools: true,
        buildDir: Browser.Firefox,
    },
};

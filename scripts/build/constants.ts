import path from 'path';

export enum BuildTargetEnv {
    Dev = 'dev',
    Beta = 'beta',
    Release = 'release',
    Test = 'test',
}

const isValidBuildEnv = (buildEnv: string): buildEnv is BuildTargetEnv => {
    return Object.values(BuildTargetEnv).includes(buildEnv as BuildTargetEnv);
};

const buildEnv = process.env.BUILD_ENV || BuildTargetEnv.Dev;

if (!isValidBuildEnv(buildEnv)) {
    throw new Error(`Invalid BUILD_ENV: ${buildEnv}`);
}

export const BUILD_ENV: BuildTargetEnv = buildEnv;

export interface EnvConfig {
    outputPath: string;
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

export interface BrowserConfig {
    browser: Browser;
    devtools: boolean;
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

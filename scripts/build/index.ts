import { program } from 'commander';

import { bundleRunner } from './bundle-runner';
import { Browser, BUILD_ENV, BuildTargetEnv } from './constants';
import { getWebpackConfig } from './webpack-config';

type CommanderOptions = {
    [key: string]: any,
};

const bundleChrome = (options: CommanderOptions) => {
    const webpackConfig = getWebpackConfig(Browser.Chrome, options.watch);
    return bundleRunner(webpackConfig, { watch: options.watch, cache: options.cache });
};

const devPlan = [
    bundleChrome,
];

const releasePlan = [
    bundleChrome,
];

const testPlan = [
    bundleChrome,
];

const runBuild = async (
    tasks: ((options: CommanderOptions) => Promise<unknown>)[],
    options: CommanderOptions,
) => {
    for (const task of tasks) {
        // eslint-disable-next-line no-await-in-loop
        await task(options);
    }
};

const mainBuild = async (options: CommanderOptions) => {
    switch (BUILD_ENV) {
        case BuildTargetEnv.Dev: {
            await runBuild(devPlan, options);
            break;
        }
        case BuildTargetEnv.Release: {
            await runBuild(releasePlan, options);
            break;
        }
        case BuildTargetEnv.Test: {
            await runBuild(testPlan, options);
            break;
        }
        default:
            throw new Error('Provide BUILD_ENV to choose correct build plan');
    }
};

const main = async (options: CommanderOptions) => {
    try {
        await mainBuild(options);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

const chrome = async (options: CommanderOptions) => {
    try {
        await bundleChrome(options);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

program
    .option('--watch', 'Builds in watch mode', false)
    .option(
        '--no-cache',
        'Builds without cache. Is useful when watch mode rebuild on the changes from the linked dependencies',
        true,
    );

program
    .command('chrome')
    .description('Builds extension for chrome browser')
    .action(async () => {
        await chrome(program.opts());
    });

program
    .description('By default builds for all platforms')
    .action(async () => {
        await main(program.opts());
    });

program.parse(process.argv);

import fs from 'fs';
import path from 'path';

import { type Configuration } from '@rspack/core';
import { program } from 'commander';

import { bundleRunner } from './bundle-runner';
import { Browser, BUILD_ENV, BuildTargetEnv } from './constants';
import { createZip } from './create-zip';
import { getRspackConfig } from './rspack-config';

type CommanderOptions = {
    [key: string]: any,
};

type PackagePaths = {
    /** Directory the bundler emits into. */
    sourceDir: string,
    /** Archive to write, sitting alongside the source directory. */
    zipPath: string,
};

/**
 * Derives the packaging paths from the config that produced the build.
 *
 * Reading the location back off the config, rather than recomputing it, keeps the
 * archive from ever drifting away from what was actually emitted. This mirrors how
 * the old ZipWebpackPlugin resolved `path: '../'` against
 * `compilation.options.output.path`.
 */
const getPackagePaths = (rspackConfig: Configuration, browser: Browser): PackagePaths => {
    const outputPath = rspackConfig.output?.path;
    if (typeof outputPath !== 'string') {
        throw new Error(`Cannot package "${browser}": the Rspack config has no output.path`);
    }

    return {
        sourceDir: outputPath,
        zipPath: path.join(outputPath, '..', `${browser}.zip`),
    };
};

const bundleChrome = async (options: CommanderOptions) => {
    const rspackConfig = getRspackConfig(Browser.Chrome);

    // Watch mode rebuilds continuously, so packaging only makes sense for
    // one-shot builds — this mirrors the old !isWatchMode guard on the zip plugin.
    if (options.watch) {
        await bundleRunner(rspackConfig, { watch: true, cache: options.cache });
        return;
    }

    const { sourceDir, zipPath } = getPackagePaths(rspackConfig, Browser.Chrome);

    // Discard any archive left by an earlier run *before* building, so a failed
    // build cannot leave a stale, still-publishable zip behind. `output.clean`
    // does not cover it, because the archive lives one level above the output
    // directory it belongs to.
    await fs.promises.rm(zipPath, { force: true });

    await bundleRunner(rspackConfig, { watch: false, cache: options.cache });
    await createZip(sourceDir, zipPath);
};

const devPlan = [
    bundleChrome,
];

const betaPlan = [
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
        case BuildTargetEnv.Beta: {
            await runBuild(betaPlan, options);
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

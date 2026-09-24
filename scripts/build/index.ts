/**
 * @file CLI entry point that builds (and, outside watch mode, zips) the extension per browser.
 */

import fs from 'fs';
import path from 'path';

import { type Configuration } from '@rspack/core';
import { program } from 'commander';

import { bundleRunner } from './bundle-runner';
import { Browser, BUILD_ENV, BuildTargetEnv } from './constants';
import { createZip } from './create-zip';
import { getRspackConfig } from './rspack-config';

/**
 * Build flags parsed by commander.
 */
interface CommanderOptions {
    /**
     * Rebuild on source changes instead of building once.
     */
    watch: boolean;

    /**
     * Use the bundler cache; `--no-cache` turns it off.
     */
    cache: boolean;
}

/**
 * Source directory and destination archive path for one browser's package step.
 */
interface PackagePaths {
    /**
     * Directory the bundler emits into.
     */
    sourceDir: string;

    /**
     * Archive to write, sitting alongside the source directory.
     */
    zipPath: string;
}

/**
 * Derives the packaging paths from the config that produced the build.
 *
 * Reading the location back off the config, rather than recomputing it, keeps the
 * archive from ever drifting away from what was actually emitted. This mirrors how
 * the old ZipWebpackPlugin resolved `path: '../'` against
 * `compilation.options.output.path`.
 *
 * @param rspackConfig Rspack configuration the build was run with.
 * @param browser Browser being packaged.
 *
 * @returns The build's output directory and the zip path it should be packaged to.
 *
 * @throws When `rspackConfig` has no `output.path`.
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

/**
 * Builds the extension for one browser and, outside watch mode, packages it into a zip.
 *
 * @param browser Browser to build.
 * @param options Parsed CLI flags.
 */
const bundleBrowser = async (browser: Browser, options: CommanderOptions) => {
    const rspackConfig = getRspackConfig(browser);

    // Watch mode rebuilds continuously, so packaging only makes sense for
    // one-shot builds — this mirrors the old !isWatchMode guard on the zip plugin.
    if (options.watch) {
        await bundleRunner(rspackConfig, { watch: true, cache: options.cache });
        return;
    }

    const { sourceDir, zipPath } = getPackagePaths(rspackConfig, browser);

    // Discard any archive left by an earlier run *before* building, so a failed
    // build cannot leave a stale, still-publishable zip behind. `output.clean`
    // does not cover it, because the archive lives one level above the output
    // directory it belongs to.
    await fs.promises.rm(zipPath, { force: true });

    await bundleRunner(rspackConfig, { watch: false, cache: options.cache });
    await createZip(sourceDir, zipPath);
};

const devPlan = [
    (options: CommanderOptions) => bundleBrowser(Browser.Chrome, options),
];

const betaPlan = [
    (options: CommanderOptions) => bundleBrowser(Browser.Chrome, options),
];

const releasePlan = [
    (options: CommanderOptions) => bundleBrowser(Browser.Chrome, options),
    (options: CommanderOptions) => bundleBrowser(Browser.Edge, options),
    (options: CommanderOptions) => bundleBrowser(Browser.Firefox, options),
];

const testPlan = [
    (options: CommanderOptions) => bundleBrowser(Browser.Chrome, options),
];

/**
 * Runs a build plan's tasks one after another, in order.
 *
 * @param tasks Build steps to run in sequence.
 * @param options Parsed CLI flags passed through to each task.
 */
const runBuild = async (
    tasks: ((options: CommanderOptions) => Promise<unknown>)[],
    options: CommanderOptions,
) => {
    for (const task of tasks) {
        await task(options);
    }
};

/**
 * Runs the build plan matching the current `BUILD_ENV`.
 *
 * @param options Parsed CLI flags passed through to each task.
 *
 * @throws When `BUILD_ENV` is not one of the known target environments.
 */
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

/**
 * Runs the default (no-subcommand) build plan, exiting the process with code 1 on failure.
 *
 * @param options Parsed CLI flags.
 */
const main = async (options: CommanderOptions) => {
    try {
        await mainBuild(options);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

/**
 * Runs the `bundleBrowser` step for a single browser subcommand, exiting the process with
 * code 1 on failure.
 *
 * @param browser Browser selected on the command line.
 * @param options Parsed CLI flags.
 */
const buildSelectedBrowser = async (browser: Browser, options: CommanderOptions) => {
    try {
        await bundleBrowser(browser, options);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

program
    .allowExcessArguments(false)
    .option('--watch', 'Builds in watch mode', false)
    .option(
        '--no-cache',
        'Builds without cache. Is useful when watch mode rebuild on the changes from the linked dependencies',
        true,
    );

program
    .command('chrome')
    .allowExcessArguments(false)
    .description('Builds extension for chrome browser')
    .action(async () => {
        await buildSelectedBrowser(Browser.Chrome, program.opts<CommanderOptions>());
    });

program
    .command('edge')
    .allowExcessArguments(false)
    .description('Builds extension for Edge')
    .action(async () => {
        await buildSelectedBrowser(Browser.Edge, program.opts<CommanderOptions>());
    });

program
    .command('firefox')
    .allowExcessArguments(false)
    .description('Builds extension for Firefox')
    .action(async () => {
        await buildSelectedBrowser(Browser.Firefox, program.opts<CommanderOptions>());
    });

program
    .description('By default builds for all platforms')
    .action(async () => {
        await main(program.opts<CommanderOptions>());
    });

program.parse(process.argv);

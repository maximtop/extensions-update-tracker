// Node built-in modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Third-party modules
import { type Configuration, rspack } from '@rspack/core';

// Local imports
import {
    BUILD_PATH,
    BuildTargetEnv,
    BUILD_ENV,
    BrowserConfig,
} from './constants';
import { getEnvConf } from './helpers';

const config = getEnvConf(BUILD_ENV);

// Get current directory equivalent to __dirname in ESM
const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

const BACKGROUND_PATH = path.resolve(currentDirPath, '../../src/entrypoints/background');
const POPUP_PATH = path.resolve(currentDirPath, '../../src/entrypoints/popup');
const OPTIONS_PATH = path.resolve(currentDirPath, '../../src/entrypoints/options');
const BACKGROUND_OUTPUT = 'background';
const POPUP_OUTPUT = 'popup';
const OPTIONS_OUTPUT = 'options';

const OUTPUT_PATH = config.outputPath;

const isDev = BUILD_ENV === BuildTargetEnv.Dev;

/**
 * Suffix appended to the localized extension name (the one the manifest shows
 * via __MSG_name__) so dev and beta installs are distinguishable from release.
 */
const NAME_SUFFIXES: Partial<Record<BuildTargetEnv, string>> = {
    [BuildTargetEnv.Dev]: ' (Dev)',
    [BuildTargetEnv.Beta]: ' (Beta)',
};

/**
 * Appends the build-specific name suffix to a copied locale messages.json file
 */
const transformLocaleMessages = (content: Buffer): string | Buffer => {
    const suffix = NAME_SUFFIXES[BUILD_ENV];
    if (!suffix) {
        return content;
    }
    const messages = JSON.parse(content.toString());
    if (messages.name?.message) {
        messages.name.message += suffix;
    }
    return JSON.stringify(messages, null, 4);
};

/**
 * Stamps the copied manifest with the version from package.json, so the two can
 * never drift apart in a published build.
 */
const transformManifest = (content: Buffer): string => {
    const packageJsonPath = path.resolve(currentDirPath, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const manifestJson = JSON.parse(content.toString());
    manifestJson.version = packageJson.version;
    return JSON.stringify(manifestJson, null, 2);
};

export const genCommonConfig = (browserConfig: BrowserConfig): Configuration => ({
    // Set the mode based on the environment
    mode: isDev ? 'development' : 'production',
    // Adjust optimization settings
    optimization: {
        minimize: false, // Disable code minification to keep code readable
        runtimeChunk: false,
    },
    cache: isDev,
    // Set devtool to false for production to disable source maps
    devtool: isDev ? 'inline-source-map' : false,
    entry: {
        [BACKGROUND_OUTPUT]: {
            import: BACKGROUND_PATH,
        },
        [POPUP_OUTPUT]: {
            import: POPUP_PATH,
        },
        [OPTIONS_OUTPUT]: {
            import: OPTIONS_PATH,
        },
    },
    output: {
        path: path.join(BUILD_PATH, OUTPUT_PATH, browserConfig.buildDir),
        filename: '[name].js',
        // Native replacement for CleanWebpackPlugin
        clean: true,
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        symlinks: false,
        alias: {
            '@': path.resolve(currentDirPath, '../../src'),
        },
    },
    module: {
        rules: [
            {
                test: /\.(js|ts)x?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'builtin:swc-loader',
                        // builtin:swc-loader does not read .swcrc, so the SWC
                        // options have to be declared inline here.
                        options: {
                            jsc: {
                                parser: {
                                    syntax: 'typescript',
                                    tsx: true,
                                    decorators: true,
                                },
                                transform: {
                                    legacyDecorator: true,
                                    decoratorMetadata: true,
                                },
                            },
                        },
                    },
                ],
            },
            {
                test: /\.css$/,
                // Opts out of Rspack's native CSS pipeline, which cannot be
                // combined with css-loader/style-loader.
                type: 'javascript/auto',
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: false,
                        },
                    },
                ],
            },
        ],
    },
    plugins: [
        new rspack.CopyRspackPlugin({
            patterns: [
                {
                    from: path.resolve(currentDirPath, '../../src/assets'),
                    to: 'assets',
                    globOptions: {
                        ignore: ['**/.DS_Store'],
                    },
                },
                {
                    from: path.resolve(currentDirPath, '../../src/_locales'),
                    to: '_locales',
                    transform: transformLocaleMessages,
                },
                {
                    from: path.resolve(currentDirPath, '../../src/manifest.json'),
                    to: 'manifest.json',
                    transform: transformManifest,
                },
            ],
        }),
        new rspack.HtmlRspackPlugin({
            template: path.join(POPUP_PATH, 'index.html'),
            filename: `${POPUP_OUTPUT}.html`,
            chunks: [POPUP_OUTPUT],
            scriptLoading: 'blocking',
        }),
        new rspack.HtmlRspackPlugin({
            template: path.join(OPTIONS_PATH, 'options.html'),
            filename: `${OPTIONS_OUTPUT}.html`,
            chunks: [OPTIONS_OUTPUT],
            scriptLoading: 'blocking',
        }),
    ],
});

// Node built-in modules
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Third-party modules
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Configuration, WebpackPluginInstance } from 'webpack';
import ZipWebpackPlugin from 'zip-webpack-plugin';

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

export const genCommonConfig = (
    browserConfig: BrowserConfig,
    isWatchMode: boolean,
): Configuration => {
    const configuration: Configuration = {
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
                            loader: 'swc-loader',
                        },
                    ],
                },
                {
                    test: /\.(css|pcss)$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                url: false,
                            },
                        },
                        'postcss-loader',
                    ],
                },
            ],
        },
        plugins: [
            new CleanWebpackPlugin({}),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: path.resolve(currentDirPath, '../../src/assets'),
                        to: 'assets',
                    },
                    {
                        from: path.resolve(currentDirPath, '../../src/_locales'),
                        to: '_locales',
                    },
                    {
                        from: path.resolve(currentDirPath, '../../src/manifest.json'),
                        to: 'manifest.json',
                        transform: async (content) => {
                            const packageJsonPath = path.resolve(currentDirPath, '../../package.json');
                            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                            const manifestJson = JSON.parse(content.toString());
                            manifestJson.version = packageJson.version;
                            return JSON.stringify(manifestJson, null, 2);
                        },
                    },
                ],
            }),
            new HtmlWebpackPlugin({
                template: path.join(POPUP_PATH, 'index.html'),
                filename: `${POPUP_OUTPUT}.html`,
                chunks: [POPUP_OUTPUT],
                scriptLoading: 'blocking',
                cache: false,
            }) as WebpackPluginInstance,
            new HtmlWebpackPlugin({
                template: path.join(OPTIONS_PATH, 'options.html'),
                filename: `${OPTIONS_OUTPUT}.html`,
                chunks: [OPTIONS_OUTPUT],
                scriptLoading: 'blocking',
                cache: false,
            }) as WebpackPluginInstance,
        ],
    };

    if (!isWatchMode && configuration.plugins) {
        configuration.plugins.push(new ZipWebpackPlugin({
            path: '../',
            filename: `${browserConfig.browser}.zip`,
        }) as unknown as WebpackPluginInstance);
    }

    return configuration;
};

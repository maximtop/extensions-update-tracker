/* eslint-disable no-console */
import webpack, { Stats } from 'webpack';
import { merge } from 'webpack-merge';

type Options = {
    watch: boolean,
    cache: boolean,
};

type RunCallback<T> = (err: Error | null, stats: T | undefined) => void;

export const bundleRunner = (webpackConfig: webpack.Configuration, options: Options): Promise<void> => {
    const { watch, cache } = options;

    // Without cache, building watches linked dependencies, but building takes 5-7 seconds.
    // With cache, building happens almost instantly, but changes from linked dependencies are not applied.
    if (watch) {
        // eslint-disable-next-line no-param-reassign
        webpackConfig = merge(webpackConfig, { cache });
    }

    const compiler = webpack(webpackConfig);

    const run = watch
        ? (cb: RunCallback<Stats>) => compiler.watch({
            followSymlinks: true,
            aggregateTimeout: 300,
            ignored: [
                'build',
            ],
        }, cb)
        : (cb: RunCallback<Stats>) => compiler.run(cb);

    return new Promise((resolve, reject) => {
        run((err, stats) => {
            if (err) {
                console.error(err.stack || err);
                // @ts-ignore
                if (err.details) {
                    // @ts-ignore
                    console.error(err.details);
                }
                reject();
                return;
            }
            if (stats) {
                if (stats.hasErrors()) {
                    console.info(stats.toString({
                        colors: true,
                        all: false,
                        errors: true,
                        moduleTrace: true,
                        logging: 'error',
                    }));
                    reject();
                    return;
                }

                console.info(stats.toString({
                    chunks: false, // Makes the build much quieter
                    colors: true, // Shows colors in the console
                }));
            }

            resolve();
        });
    });
};

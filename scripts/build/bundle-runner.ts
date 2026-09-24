/**
 * @file Runs an Rspack build, either once or in watch mode.
 */

import { type Configuration, rspack, type Stats } from '@rspack/core';

/**
 * Controls how {@link bundleRunner} runs the compiler.
 */
interface Options {
    /**
     * Whether to keep the compiler running and rebuild on file changes.
     */
    watch: boolean;

    /**
     * Whether to reuse the Rspack persistent cache between runs.
     */
    cache: boolean;
}

/**
 * Node-style callback invoked once a compiler run (or watch iteration) finishes.
 */
type RunCallback = (err: Error | null, stats: Stats | undefined) => void;

/**
 * Runs an Rspack compiler for the given configuration, logging the result to the console.
 *
 * @param rspackConfig Rspack configuration to compile.
 * @param options Run mode and cache settings.
 *
 * @throws When the compiler reports an error, or when the build completes with compilation errors.
 */
export const bundleRunner = async (rspackConfig: Configuration, options: Options): Promise<void> => {
    const { watch, cache } = options;

    // Without cache, building watches linked dependencies, but building takes 5-7 seconds.
    // With cache, building happens almost instantly, but changes from linked dependencies are not applied.
    const compiler = rspack(watch ? { ...rspackConfig, cache } : rspackConfig);

    const run = watch
        ? (cb: RunCallback) => compiler.watch({
            followSymlinks: true,
            aggregateTimeout: 300,
            ignored: [
                'build',
            ],
        }, cb)
        : (cb: RunCallback) => compiler.run(cb);

    const compiled = new Promise<void>((resolve, reject) => {
        run((err, stats) => {
            if (err) {
                // `details` carries Rspack-specific context that the error's own
                // stack does not include; the caller logs the error itself.
                if ('details' in err && err.details) {
                    console.error(err.details);
                }
                reject(err);
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
                    // The formatted compiler errors are already printed above, so
                    // this only needs to make the failure non-silent for callers.
                    reject(new Error('Build failed: the bundle has compilation errors'));
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

    try {
        await compiled;
    } finally {
        // Rspack holds native resources until the compiler is closed. Watch mode
        // keeps the compiler alive by design, so only one-shot builds close here.
        if (!watch) {
            await new Promise<void>((resolve) => {
                compiler.close(() => resolve());
            });
        }
    }
};

/**
 * @file Command-line entry of the release preparation, run by the deploy workflows.
 */

import { prepare } from './prepare';

try {
    prepare();
} catch (error) {
    const message = error instanceof Error ? error.message : 'Release preparation failed';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
}

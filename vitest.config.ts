/**
 * @file Vitest configuration for unit and integration tests.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
    },
});

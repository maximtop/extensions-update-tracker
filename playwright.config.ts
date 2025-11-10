import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for browser extension testing
 */
export default defineConfig({
    testDir: './tests/e2e',
    // Timeout for each test (30 seconds)
    timeout: 30000,
    // Timeout for each assertion (10 seconds)
    expect: {
        timeout: 10000,
    },
    // Fail fast on CI
    fullyParallel: true,
    // Retry on failures
    retries: process.env.CI ? 2 : 0,
    // Reporter to use
    reporter: [
        ['html', { outputFolder: 'playwright-report' }],
        ['list'],
    ],
    // Shared settings for all projects
    use: {
        // Base URL for the extension (will be set dynamically in tests)
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    // Configure projects for different browsers
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Required for extension testing
                channel: 'chrome',
            },
        },
    ],
});

# E2E Tests for Extensions Update Tracker

This directory contains end-to-end integration tests using Playwright for testing the Chrome extension.

## Prerequisites

Install Playwright browsers (first time only):
```bash
pnpm exec playwright install chromium
```

**Note:**
- Tests automatically build the extension to `dist/test/chrome/` before running
- Tests run in **headed mode** (visible browser windows) because Chrome extensions don't work reliably in headless mode

## Running Tests

### Run all tests (builds automatically)
```bash
pnpm test:e2e
```

### Manual build for tests
If you want to build separately:
```bash
pnpm build:test
```

### Run tests with UI mode (interactive)
```bash
pnpm test:e2e:ui
```

### Debug tests
```bash
pnpm test:e2e:debug
```

### Run specific test file
```bash
pnpm exec playwright test 01-basic-functionality
```

## Test Structure

### Test 1: Basic Functionality (`01-basic-functionality.spec.ts`)
- Installs the extension in a Chrome browser
- Verifies no console errors in:
  - Background page
  - Options page
  - Popup page
- Checks that all pages load correctly

### Test 2: Mark All as Read (`02-mark-all-as-read.spec.ts`)
- Opens the options page
- Clicks "Mark All as Read" button
- Verifies:
  - Message is sent to background page
  - Storage is updated (badge count becomes 0)
  - UI updates to show 0 unread updates
  - "New" badges are removed from items

## Test Reports

After running tests, view the HTML report:
```bash
pnpm exec playwright show-report
```

## Troubleshooting

### Extension not loading
Make sure you've built the extension first:
```bash
pnpm build
```

### Chrome not found
Install Chrome browser for Playwright:
```bash
pnpm exec playwright install chrome
```

### Tests timing out
The extension might need more time to initialize. The tests include reasonable timeouts, but you can adjust them in individual test files if needed.

## Writing New Tests

1. Create a new file: `tests/e2e/XX-test-name.spec.ts`
2. Import helpers from `./setup.ts`
3. Use the `getExtensionPath()` to load the extension
4. Use `getExtensionUrls()` to get extension page URLs
5. Use `setupConsoleErrorDetection()` to monitor console errors

Example:
```typescript
import { test, expect, chromium } from '@playwright/test';
import { getExtensionPath, getExtensionUrls, setupConsoleErrorDetection } from './setup';

test('my new test', async () => {
    const extensionPath = getExtensionPath();
    const browser = await chromium.launchPersistentContext('', {
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
        ],
    });

    // Your test code here

    await browser.close();
});
```


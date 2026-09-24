import path from 'path';

const currentDir = import.meta.dirname;

/**
 * Get path to the sample extension for testing
 */
export function getSampleExtensionPath(): string {
    return path.join(currentDir, '../../tests/sample-extension');
}

/**
 * Wait for updates to be detected
 * The extension tracks itself and any other installed extensions
 *
 * @param timeoutMs How long to wait, in milliseconds, before resolving.
 */
export async function waitForUpdatesToBeTracked(timeoutMs = 3000): Promise<void> {
    // Wait for the background service worker to detect extensions
    await new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
    });
}

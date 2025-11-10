import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get path to the sample extension for testing
 */
export function getSampleExtensionPath(): string {
    return path.join(__dirname, '../../tests/sample-extension');
}

/**
 * Wait for updates to be detected
 * The extension tracks itself and any other installed extensions
 */
export async function waitForUpdatesToBeTracked(timeoutMs: number = 3000): Promise<void> {
    // Wait for the background service worker to detect extensions
    await new Promise((resolve) => {
        setTimeout(resolve, timeoutMs);
    });
}

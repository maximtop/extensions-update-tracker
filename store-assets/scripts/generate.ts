/**
 * Regenerates every Chrome Web Store image asset.
 *
 * Run it with `pnpm store-assets`, which builds the release bundle first — the
 * screenshots are captures of that bundle, so a stale `dist` would quietly
 * publish a stale UI.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { captureUi } from './capture-ui';
import { composeAssets } from './compose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '../..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'store-assets/out');
const RAW_DIR = path.join(OUTPUT_DIR, 'raw');
const ICON_PATH = path.join(REPO_ROOT, 'src/assets/icons/icon-128.png');
const STORE_ICON = 'store-icon-128.png';

const main = async (): Promise<void> => {
    const captures = await captureUi();

    // Keeping the untouched captures makes it obvious whether a bad frame comes
    // from the UI or from the composition around it
    // Cleared first: a renamed capture would otherwise leave its old file behind
    // and the raw folder would slowly fill with shots nothing uses any more
    await fs.rm(RAW_DIR, { recursive: true, force: true });
    await fs.mkdir(RAW_DIR, { recursive: true });
    for (const [name, png] of Object.entries(captures)) {
        await fs.writeFile(path.join(RAW_DIR, `${name}.png`), png);
    }

    const icon = await fs.readFile(ICON_PATH);
    const written = await composeAssets(captures, icon, OUTPUT_DIR);

    // The store icon is uploaded separately from the manifest icons, so ship a
    // copy next to the other assets instead of hunting for it under src/
    await fs.writeFile(path.join(OUTPUT_DIR, STORE_ICON), icon);
    written.push(STORE_ICON);

    const relativeOutput = path.relative(REPO_ROOT, OUTPUT_DIR);
    process.stdout.write(`\nStore assets written to ${relativeOutput}/\n`);
    for (const file of written) {
        process.stdout.write(`  ${file}\n`);
    }
    process.stdout.write(`  raw/ (${Object.keys(captures).length} unstyled UI captures)\n\n`);
};

main().catch((error) => {
    process.stderr.write(`Failed to generate store assets: ${error}\n`);
    process.exitCode = 1;
});

/**
 * Composes the final Chrome Web Store assets from the raw UI captures.
 *
 * Every output is rendered at its exact target size with a device scale factor
 * of 1, so what the store receives is a pixel-exact 1280x800 / 440x280 /
 * 1400x560 PNG and not something resampled afterwards.
 *
 * Each capture is drawn at exactly half its own pixel size. That is the whole
 * sharpness contract: the capture step produces a 2x source, and this step
 * reduces it 2:1, which is the one ratio that maps four device pixels onto one
 * output pixel without smearing a glyph stem or a 1px hairline. The sizes are
 * read from each PNG's own header rather than assumed, and a capture that will
 * not fit its slot fails the build instead of being quietly scaled down.
 */

import fs from 'fs/promises';
import path from 'path';

import { chromium, type Browser, type Page } from 'playwright';

import { COMPOSE_DIVISOR } from './capture-ui';
import { PROMO_VERSION_ROUTE } from './demo-data';
import {
    CENTERED_STAGE_HEIGHT,
    marquee,
    screenshotFrame,
    smallTile,
    STAGE_WIDTH,
    type FrameVariant,
} from './templates';

import type { UiCaptures } from './capture-ui';

interface ScreenshotSpec {
    file: string;
    title: string;
    subtitle: string;
    capture: keyof UiCaptures;
    variant: FrameVariant;
}

/**
 * The five listing screenshots, one user scenario each, in the order they
 * should be uploaded — the first one is the only one most visitors will see.
 */
const SCREENSHOTS: ScreenshotSpec[] = [
    {
        file: 'screenshot-1-update-detected.png',
        title: 'See the update the moment it lands',
        subtitle: 'The toolbar popup shows which extension changed and which version replaced which.',
        capture: 'popupHero',
        variant: 'split',
    },
    {
        file: 'screenshot-2-update-history.png',
        title: 'Every update, kept in one history',
        subtitle: 'Your installed extensions, the versions they shipped, and when each one arrived.',
        capture: 'updatesList',
        variant: 'bleed',
    },
    {
        file: 'screenshot-3-unread-workflow.png',
        title: 'Clear the unread queue in one click',
        subtitle: 'Mark everything as read — and undo it right away if you were too quick.',
        capture: 'markAllUndo',
        variant: 'bleed',
    },
    {
        file: 'screenshot-4-settings.png',
        title: 'Notifications on your terms',
        subtitle: 'Turn alerts and sound off, or disable extensions automatically the moment they update.',
        capture: 'settings',
        variant: 'bleed',
    },
    {
        file: 'screenshot-5-version-history.png',
        title: 'Audit any extension version by version',
        subtitle: 'Open an extension to see every version it has shipped, newest first.',
        capture: 'versionHistoryCard',
        variant: 'centered',
    },
];

const SCREENSHOT_SIZE = { width: 1280, height: 800 };
const SMALL_TILE_SIZE = { width: 440, height: 280 };
const MARQUEE_SIZE = { width: 1400, height: 560 };

const PNG_SIGNATURE = 0x89504e47;
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;

interface Size {
    width: number;
    height: number;
}

/**
 * Reads a PNG's pixel dimensions from its IHDR chunk.
 *
 * The header is the only trustworthy source: Playwright expands a screenshot
 * clip to an enclosing integer rect, so an emitted height can differ by a pixel
 * or two from `cssBox * deviceScaleFactor`.
 */
const readPngSize = (png: Buffer): Size => {
    if (png.readUInt32BE(0) !== PNG_SIGNATURE) {
        throw new Error('Capture is not a PNG');
    }
    return {
        width: png.readUInt32BE(IHDR_WIDTH_OFFSET),
        height: png.readUInt32BE(IHDR_HEIGHT_OFFSET),
    };
};

/**
 * The size a capture is drawn at: exactly half its own pixels.
 */
const displaySize = (png: Buffer, label: string): Size => {
    const { width, height } = readPngSize(png);

    if (width % COMPOSE_DIVISOR !== 0 || height % COMPOSE_DIVISOR !== 0) {
        throw new Error(
            `Capture "${label}" is ${width}x${height}, which does not divide by ${COMPOSE_DIVISOR}. `
            + 'An odd dimension cannot be reduced exactly and would be resampled fractionally.',
        );
    }

    return { width: width / COMPOSE_DIVISOR, height: height / COMPOSE_DIVISOR };
};

const toDataUrl = (png: Buffer): string => `data:image/png;base64,${png.toString('base64')}`;

/**
 * Fails the build if a caption outgrew its fixed block or a capture outgrew its
 * slot. Both would otherwise pass silently: the canvas clips its overflow, so an
 * oversized capture produces no scrollbar, no error and no size change — it just
 * loses whatever ran past the edge.
 */
const assertNothingOverflows = async (page: Page, label: string): Promise<void> => {
    const overflow = await page.evaluate(() => {
        const copy = document.querySelector('.copy');
        const stage = document.querySelector('.stage');
        const shot = document.querySelector('.shot');
        if (copy === null || stage === null || shot === null) {
            return 'frame is missing .copy, .stage or .shot';
        }

        if (copy.scrollHeight > copy.clientHeight) {
            return `caption needs ${copy.scrollHeight}px but its block is ${copy.clientHeight}px`;
        }

        const stageRect = stage.getBoundingClientRect();
        const shotRect = shot.getBoundingClientRect();
        if (shotRect.height > stageRect.height + 0.5 || shotRect.width > stageRect.width + 0.5) {
            return `capture is ${shotRect.width}x${shotRect.height} in a `
                + `${stageRect.width}x${stageRect.height} stage`;
        }

        return null;
    });

    if (overflow !== null) {
        throw new Error(`${label}: ${overflow}`);
    }
};

/**
 * Renders one HTML template to a PNG of exactly `size`.
 */
const renderToPng = async (
    browser: Browser,
    html: string,
    size: Size,
    label: string,
    checkOverflow = false,
): Promise<Buffer> => {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
    try {
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        if (checkOverflow) {
            await assertNothingOverflows(page, label);
        }
        return await page.screenshot();
    } finally {
        await page.close();
    }
};

/**
 * Writes every composed asset into `outputDir`.
 *
 * @param captures Raw UI captures from the built extension
 * @param icon The extension's 128px icon, reused as the promo lockup mark
 * @param outputDir Absolute path the PNGs are written to
 * @returns The file names that were written
 */
export async function composeAssets(
    captures: UiCaptures,
    icon: Buffer,
    outputDir: string,
): Promise<string[]> {
    await fs.mkdir(outputDir, { recursive: true });

    const iconUrl = toDataUrl(icon);
    const browser = await chromium.launch();
    const written: string[] = [];

    try {
        for (const spec of SCREENSHOTS) {
            const capture = captures[spec.capture];
            const { width, height } = displaySize(capture, spec.capture);

            // Checked here as well as inside the frame so the message can name
            // the capture that has to change, not just the pixels that did not fit
            if (spec.variant !== 'split' && width > STAGE_WIDTH) {
                throw new Error(
                    `Capture "${spec.capture}" draws ${width}px wide, past the ${STAGE_WIDTH}px slot`,
                );
            }
            if (spec.variant === 'centered' && height > CENTERED_STAGE_HEIGHT) {
                throw new Error(
                    `Capture "${spec.capture}" draws ${height}px tall, past the ${CENTERED_STAGE_HEIGHT}px slot`,
                );
            }

            const html = screenshotFrame({
                title: spec.title,
                subtitle: spec.subtitle,
                image: toDataUrl(capture),
                imageWidth: width,
                imageHeight: height,
                variant: spec.variant,
            });
            await fs.writeFile(
                path.join(outputDir, spec.file),
                await renderToPng(browser, html, SCREENSHOT_SIZE, spec.file, true),
            );
            written.push(spec.file);
        }

        const tileFile = 'promo-small-tile-440x280.png';
        await fs.writeFile(
            path.join(outputDir, tileFile),
            await renderToPng(browser, smallTile(iconUrl, PROMO_VERSION_ROUTE), SMALL_TILE_SIZE, tileFile),
        );
        written.push(tileFile);

        const promo = displaySize(captures.popupPromo, 'popupPromo');
        const marqueeFile = 'promo-marquee-1400x560.png';
        await fs.writeFile(
            path.join(outputDir, marqueeFile),
            await renderToPng(
                browser,
                marquee(iconUrl, toDataUrl(captures.popupPromo), promo.width, promo.height),
                MARQUEE_SIZE,
                marqueeFile,
            ),
        );
        written.push(marqueeFile);
    } finally {
        await browser.close();
    }

    return written;
}

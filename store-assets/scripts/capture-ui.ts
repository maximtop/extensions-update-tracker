/**
 * Captures the extension's real UI for use inside the store assets.
 *
 * Everything here renders `dist/release/chrome` — the same bundle that ships —
 * with the background service worker replaced by a scripted stand-in.
 *
 * THE ONE RULE THAT KEEPS THE OUTPUT SHARP: every capture is taken at exactly
 * twice the pixel size of the box it will occupy in the finished frame, and the
 * composer then draws it at exactly half. A clean 2:1 reduction collapses four
 * device pixels into one and leaves the UI's 1px hairlines exactly 1px wide.
 *
 * Letting the frame's leftover space decide the scale instead — which is what
 * `max-width`/`max-height` used to do here — produced ratios like 0.427 and
 * 0.601, at which glyph stems land across fractional pixel boundaries and
 * dissolve into antialiasing. That, not the capture resolution, was the blur.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import {
chromium,
type Browser,
type BrowserContext,
type Locator,
type Page,
} from 'playwright';

import { DEFAULT_SETTINGS } from '../../src/common/types/settings-types';

import {
    buildDemoExtensionsInfo,
    buildDemoStorage,
    FROZEN_NOW_MS,
    HISTORY_SHOWCASE_NAME,
} from './demo-data';
import { installMockExtensionApi, type MockExtensionApiConfig } from './mock-extension-api';
import { startStaticServer } from './static-server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '../..');
const BUILD_DIR = path.join(REPO_ROOT, 'dist/release/chrome');
const EN_MESSAGES = path.join(REPO_ROOT, 'src/_locales/en/messages.json');

/**
 * The factor the composer reduces every capture by. Kept here because it is
 * what the capture sizes below are derived from — the two must agree exactly or
 * the 2:1 guarantee is silently lost.
 */
export const COMPOSE_DIVISOR = 2;

/**
 * Width of the UI slot in every non-split frame, in final image pixels.
 *
 * One width for all four options-page frames is what stops the card from
 * swimming left and right as a reviewer flips through the gallery.
 */
const OPTIONS_SLOT_WIDTH = 1152;

/** Slot height for the frame whose capture runs off the bottom edge */
const BLEED_SLOT_HEIGHT = 592;

/** Slot height for frames that show the capture whole */
const CENTERED_SLOT_HEIGHT = 560;

/** The popup's own fixed width, from `src/popup/styles.css` */
const POPUP_WIDTH = 380;

/**
 * The popup is intrinsically small, so the hero frame shows it at 1.5x. That is
 * still an exact 2:1 reduction from a 3x capture; only the UI's hairlines pay,
 * landing on a deterministic 1.5px rather than dissolving.
 */
const POPUP_HERO_ZOOM = 1.5;

/**
 * Where the card is parked before the version-history capture is clipped.
 *
 * The clip itself takes the card's exact vertical extent: the cards are a
 * continuous list with no gaps, so any vertical padding would drag its
 * neighbours into frame — a sliver of the row above and a half-drawn card
 * below, which reads as a careless crop. Horizontally the clip spans the whole
 * viewport, which keeps the page container's own gutters on both sides. That is
 * what a tight element screenshot was missing: rows ran straight into the right
 * edge while the left had 58px of indent, so the card looked amputated.
 */
const CARD_SCROLL_OFFSET = 40;

/**
 * Fast-forwards CSS animations to their end state, so a capture never lands
 * mid-fade — the undo toast in particular animates in over 180ms.
 */
const SCREENSHOT_OPTIONS = { animations: 'disabled' } as const;

/**
 * The UI captures the composer draws into the final frames.
 */
export interface UiCaptures {
    popupHero: Buffer;
    popupPromo: Buffer;
    updatesList: Buffer;
    markAllUndo: Buffer;
    settings: Buffer;
    versionHistoryCard: Buffer;
}

/**
 * Selector the list captures are scrolled to.
 *
 * The page's masthead and intro copy take up most of a viewport, and the store
 * frame repeats that message in its own caption anyway. Starting at the tab bar
 * gives the frame the data instead of a second headline.
 */
const OPTIONS_ANCHOR = '.tab-navigation';

/** Breathing room left above the anchor element */
const ANCHOR_OFFSET = 28;

/**
 * The masthead is `position: sticky`, so scrolling past it would park it on top
 * of the tab bar and every capture would open on a half-covered row. Releasing
 * it lets the page scroll away cleanly; nothing else about the UI changes.
 */
const UNSTICK_MASTHEAD = '.topnav { position: static !important; }';

/**
 * The options page switches to a narrow layout at 920px. Every capture width is
 * chosen above that, and this asserts it rather than trusting the arithmetic.
 */
const assertDesktopLayout = async (page: Page): Promise<void> => {
    const isNarrow = await page.evaluate(() => window.matchMedia('(max-width: 920px)').matches);
    if (isNarrow) {
        throw new Error('Capture viewport fell below the options page 920px breakpoint');
    }
};

/**
 * Opens a page with the mocked extension APIs already installed.
 */
const openPage = async (context: BrowserContext, url: string): Promise<Page> => {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    // The stores load over the message channel, so the first paint is a skeleton
    await page.waitForSelector('#root > *');
    return page;
};

/**
 * Scrolls the options page so `selector` sits just below the top edge.
 */
const scrollToAnchor = async (
    page: Page,
    selector = OPTIONS_ANCHOR,
    offset = ANCHOR_OFFSET,
): Promise<void> => {
    await page.addStyleTag({ content: UNSTICK_MASTHEAD });
    await page.evaluate(
        ([anchorSelector, topOffset]) => {
            const anchor = document.querySelector(anchorSelector);
            if (anchor === null) {
                throw new Error(`Capture anchor "${anchorSelector}" is missing`);
            }
            window.scrollTo(0, anchor.getBoundingClientRect().top + window.scrollY - topOffset);
        },
        [selector, offset] as const,
    );
};

/**
 * Creates a context whose device scale factor is the composer's divisor times
 * the zoom the frame wants, so the resulting capture reduces exactly 2:1.
 */
const createContext = async (
    browser: Browser,
    zoom: number,
    viewport: { width: number; height: number },
    config: MockExtensionApiConfig,
): Promise<BrowserContext> => {
    const context = await browser.newContext({
        deviceScaleFactor: COMPOSE_DIVISOR * zoom,
        viewport,
    });
    // Freezing the clock keeps "2 hours ago" labels identical between runs
    await context.clock.setFixedTime(FROZEN_NOW_MS);
    // tsx transpiles this project with esbuild's keepNames helper, so the
    // function source Playwright serializes into the page calls `__name()`.
    // That helper only exists in this module's scope, so give the page a
    // no-op stand-in before the shim runs.
    await context.addInitScript('globalThis.__name = (value) => value;');
    await context.addInitScript(installMockExtensionApi, config);
    return context;
};

/**
 * Captures the version-history card with the page's own gutters around it.
 *
 * A tight element screenshot is what made this frame read as a crop pretending
 * to be a window: the icon sat against the left edge and the row separators ran
 * straight into the corner radius. Clipping the full viewport width instead
 * keeps the container's real padding on both sides, and Playwright rounds a
 * clip rect rather than growing it, so the result stays an exact integer.
 */
const captureCard = async (page: Page, card: Locator): Promise<Buffer> => {
    await card.evaluate((element, offset) => {
        window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - offset);
    }, CARD_SCROLL_OFFSET);

    const box = await card.boundingBox();
    if (box === null) {
        throw new Error(`Version-history card "${HISTORY_SHOWCASE_NAME}" is not visible`);
    }

    // Even height only, so the composer's halved size stays a whole number
    const height = Math.ceil(box.height / 2) * 2;
    if (height > CENTERED_SLOT_HEIGHT) {
        throw new Error(
            `Version-history card needs ${height}px but the frame slot is ${CENTERED_SLOT_HEIGHT}px. `
            + 'Collapse a version list or grow the slot.',
        );
    }

    return page.screenshot({
        ...SCREENSHOT_OPTIONS,
        clip: {
            x: 0,
            y: Math.max(0, Math.round(box.y)),
            width: OPTIONS_SLOT_WIDTH,
            height,
        },
    });
};

/**
 * Captures the whole popup at the context's scale.
 *
 * The popup's height is content-driven, and `fullPage` would hand back whatever
 * odd number that works out to — 1467px at 3x, which cannot be halved. Rounding
 * the viewport up to a multiple of four instead guarantees the capture divides
 * cleanly at either zoom and that the halved size is even too, so the frame can
 * centre it on a whole pixel. The cost is at most three rows of page background
 * along the bottom edge.
 */
const capturePopup = async (context: BrowserContext, url: string): Promise<Buffer> => {
    const page = await openPage(context, url);
    try {
        const contentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        await page.setViewportSize({
            width: POPUP_WIDTH,
            height: Math.ceil(contentHeight / 4) * 4,
        });
        return await page.screenshot(SCREENSHOT_OPTIONS);
    } finally {
        await page.close();
    }
};

/**
 * Renders the built UI and returns the raw captures.
 */
export async function captureUi(): Promise<UiCaptures> {
    const messages = JSON.parse(await fs.readFile(EN_MESSAGES, 'utf-8'));

    const config: MockExtensionApiConfig = {
        messages,
        storage: buildDemoStorage(),
        extensionsInfo: buildDemoExtensionsInfo(),
        settings: DEFAULT_SETTINGS,
        nowMs: FROZEN_NOW_MS,
    };

    const server = await startStaticServer(BUILD_DIR);
    const browser = await chromium.launch();

    try {
        const optionsContext = await createContext(
            browser,
            1,
            { width: OPTIONS_SLOT_WIDTH, height: BLEED_SLOT_HEIGHT },
            config,
        );

        const updatesPage = await openPage(optionsContext, `${server.origin}/options.html`);
        await assertDesktopLayout(updatesPage);
        await scrollToAnchor(updatesPage);
        const updatesList = await updatesPage.screenshot(SCREENSHOT_OPTIONS);

        // Same page, same viewport: the undo toast only exists right after the
        // bulk action, and it pins itself to the bottom of the viewport — which
        // is the frame's bottom edge, so it lands in the shot on its own
        await updatesPage.getByTestId('mark-all-read-button').click();
        await updatesPage.waitForSelector('.toast');
        await scrollToAnchor(updatesPage);
        const markAllUndo = await updatesPage.screenshot(SCREENSHOT_OPTIONS);
        await updatesPage.close();

        const settingsPage = await openPage(optionsContext, `${server.origin}/options.html#settings`);
        await scrollToAnchor(settingsPage);
        const settings = await settingsPage.screenshot(SCREENSHOT_OPTIONS);
        await settingsPage.close();

        const cardPage = await openPage(optionsContext, `${server.origin}/options.html`);
        await cardPage.setViewportSize({ width: OPTIONS_SLOT_WIDTH, height: CENTERED_SLOT_HEIGHT });
        await cardPage.addStyleTag({ content: UNSTICK_MASTHEAD });
        const versionHistoryCard = await captureCard(
            cardPage,
            cardPage.locator('article.extension-group').filter({ hasText: HISTORY_SHOWCASE_NAME }),
        );
        await cardPage.close();

        // The popup appears at two different sizes, and a capture can only be an
        // exact 2:1 source for one of them, so it is taken once per destination
        const heroContext = await createContext(
            browser,
            POPUP_HERO_ZOOM,
            { width: POPUP_WIDTH, height: 200 },
            config,
        );
        const popupHero = await capturePopup(heroContext, `${server.origin}/popup.html`);

        const promoContext = await createContext(browser, 1, { width: POPUP_WIDTH, height: 200 }, config);
        const popupPromo = await capturePopup(promoContext, `${server.origin}/popup.html`);

        return {
            popupHero,
            popupPromo,
            updatesList,
            markAllUndo,
            settings,
            versionHistoryCard,
        };
    } finally {
        await browser.close();
        await server.close();
    }
}

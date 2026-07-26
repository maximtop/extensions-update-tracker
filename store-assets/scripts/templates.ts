/**
 * HTML templates for the composed store assets.
 *
 * The design tokens are copied from `src/common/styles/theme.css` verbatim so
 * the promo material and the product share one palette and one type voice
 * rather than merely looking similar.
 *
 * Two rules hold the gallery together:
 *
 * 1. ONE GRID. Every non-split frame puts the UI in the same box — 1152px wide,
 *    starting at x=64 — and every caption starts at the same x. Cards that
 *    change width and drift left and right between frames are what made the set
 *    read as crooked when flipped through as thumbnails.
 * 2. NO IMPLICIT SCALING. The composer passes the exact pixel size of every
 *    capture; nothing here derives an image size from leftover space. A `.shot`
 *    that does not fit its slot is a build error, not a silently blurred frame.
 */

/**
 * How a screenshot frame arranges its caption and its UI capture.
 *
 * - `bleed` runs the capture off the bottom edge, which keeps the UI large and
 *   the frame free of decorative empty margins.
 * - `centered` shows a shorter capture whole, for shots where a cropped-off
 *   bottom would read as a mistake.
 * - `split` puts the caption beside a tall, narrow capture — the popup.
 */
export type FrameVariant = 'bleed' | 'centered' | 'split';

export interface FrameContent {
    title: string;
    subtitle: string;
    /** The UI capture, already a `data:` URI */
    image: string;
    /** Exact size the capture is drawn at — half its own pixel size */
    imageWidth: number;
    imageHeight: number;
    variant: FrameVariant;
}

const TOKENS = `
    --bg: oklch(1 0 89.88);
    --surface: oklch(0.9816 0.0017 247.84);
    --fg: oklch(0.2621 0.0095 248.19);
    --muted: oklch(0.51 0.017 245);
    --border: oklch(0.9109 0.007 247.9);
    --accent: oklch(0.52 0.21 262);
    --font-display: 'Iowan Old Style', 'Charter', 'Bitstream Charter', Georgia, serif;
    --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-mono: 'SFMono-Regular', 'Cascadia Code', 'Roboto Mono', ui-monospace, monospace;
`;

/**
 * `-webkit-font-smoothing: antialiased` is deliberately absent: it thins the
 * caption's ink by about 12% for no gain in a 1x promotional PNG that will be
 * viewed shrunk in a store grid.
 */
const BASE_CSS = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: var(--font-body);
    }
    h1 {
        margin: 0;
        font-family: var(--font-display);
        font-weight: 600;
        letter-spacing: -0.015em;
        text-wrap: balance;
    }
    p { margin: 0; text-wrap: pretty; }
    img { display: block; }
    /* The ring carries the edge; the shadow only seats the panel on the page.
       Relying on the shadow alone left the UI floating in a haze. */
    .shot {
        border-radius: 16px;
        box-shadow:
            0 0 0 1px color-mix(in oklch, var(--fg) 14%, transparent),
            0 28px 70px -20px color-mix(in oklch, var(--fg) 26%, transparent),
            0 8px 20px -12px color-mix(in oklch, var(--fg) 20%, transparent);
    }
    .canvas {
        position: relative;
        overflow: hidden;
        background: linear-gradient(168deg, var(--bg) 0%, var(--surface) 62%, oklch(0.955 0.006 248) 100%);
    }
    /* A single soft accent wash, so the light background is not flat white */
    .canvas::before {
        content: '';
        position: absolute;
        inset: auto auto 0 -10%;
        width: 70%;
        aspect-ratio: 1;
        border-radius: 50%;
        background: radial-gradient(closest-side, color-mix(in oklch, var(--accent) 11%, transparent), transparent);
    }
    .canvas > * { position: relative; }
`;

const page = (width: number, height: number, css: string, body: string): string => `<!doctype html>
<html><head><meta charset="utf-8"><style>
:root {${TOKENS}}
${BASE_CSS}
.canvas { width: ${width}px; height: ${height}px; }
${css}
</style></head><body><div class="canvas">${body}</div></body></html>`;

/**
 * Escapes text interpolated into the templates.
 */
const escapeHtml = (value: string): string => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 800;

/**
 * Frame grid, in final image pixels. Exported so the capture step and the
 * overflow check work from the same numbers rather than a second copy of them.
 */
export const FRAME_GRID = {
    /** Left edge of both the caption and the UI slot */
    marginX: 64,
    /** Top of the caption block */
    paddingTop: 56,
    /**
     * Fixed caption height. Pinning it decouples the UI slot from how the
     * headline happens to wrap, so editing a caption can never move — or
     * silently resize — the screenshot beside it.
     */
    copyHeight: 128,
    /** Bottom margin under a `centered` capture */
    centeredPaddingBottom: 40,
} as const;

/** Top of the UI slot in every non-split frame */
const STAGE_TOP = FRAME_GRID.paddingTop + FRAME_GRID.copyHeight;

/** Height available to a `centered` capture */
export const CENTERED_STAGE_HEIGHT = FRAME_HEIGHT - STAGE_TOP - FRAME_GRID.centeredPaddingBottom;

/** Width available to any non-split capture */
export const STAGE_WIDTH = FRAME_WIDTH - FRAME_GRID.marginX * 2;

/**
 * Renders one 1280x800 store screenshot: a caption and a capture of the real UI.
 */
export const screenshotFrame = ({
    title,
    subtitle,
    image,
    imageWidth,
    imageHeight,
    variant,
}: FrameContent): string => {
    const css = `
    .frame {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: ${FRAME_GRID.paddingTop}px ${FRAME_GRID.marginX}px 0;
    }
    .frame.split {
        flex-direction: row;
        align-items: center;
        gap: 60px;
        padding: 0 ${FRAME_GRID.marginX}px;
    }
    .copy { height: ${FRAME_GRID.copyHeight}px; }
    .split .copy { flex: 0 0 500px; height: auto; }
    h1 { font-size: 42px; line-height: 45px; }
    .sub {
        margin-top: 16px;
        font-size: 20px;
        line-height: 29px;
        color: var(--muted);
        max-width: 760px;
    }
    .split .sub { max-width: none; }
    .rule {
        width: 64px;
        height: 4px;
        margin-bottom: 24px;
        border-radius: 999px;
        background: var(--accent);
    }
    .stage { flex: 1; min-height: 0; display: flex; justify-content: center; }
    .stage.bleed { align-items: flex-end; }
    .stage.centered { align-items: center; padding-bottom: ${FRAME_GRID.centeredPaddingBottom}px; }
    .split .stage { align-items: center; padding: 0; }
`;

    const body = `<div class="frame ${variant}">
    <div class="copy">
        <div class="rule"></div>
        <h1>${escapeHtml(title)}</h1>
        <p class="sub">${escapeHtml(subtitle)}</p>
    </div>
    <div class="stage ${variant}">
        <img class="shot" src="${image}" alt="" width="${imageWidth}" height="${imageHeight}"
            style="width:${imageWidth}px;height:${imageHeight}px">
    </div>
</div>`;

    return page(FRAME_WIDTH, FRAME_HEIGHT, css, body);
};

/**
 * Renders the 440x280 small promo tile.
 *
 * It has to survive being shown at half size in the store's grid, so it carries
 * one image, the name, and a single version route that says what the product is
 * about without a sentence of explanation. The icon is drawn at 64px — exactly
 * half its 128px source — because any other size resamples it fractionally.
 */
export const smallTile = (icon: string, versionRoute: string): string => {
    const css = `
    .tile {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 18px;
    }
    .mark { position: relative; }
    /* Drawn at its native 128px: any other size resamples the icon, and this is
       the tile's one main image, so it should carry the composition */
    .mark img { width: 128px; height: 128px; }
    .badge {
        position: absolute;
        top: 4px;
        right: -14px;
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        border: 3px solid var(--bg);
        background: var(--accent);
        color: #fff;
        font-family: var(--font-mono);
        font-size: 16px;
        font-weight: 600;
    }
    h1 { font-size: 28px; text-align: center; line-height: 32px; }
    .route {
        padding: 6px 14px;
        border-radius: 999px;
        background: color-mix(in oklch, var(--accent) 10%, transparent);
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 15px;
        font-weight: 600;
    }
`;

    const body = `<div class="tile">
    <span class="mark"><img src="${icon}" alt=""><span class="badge">4</span></span>
    <h1>Extensions Update Tracker</h1>
    <span class="route">${escapeHtml(versionRoute)}</span>
</div>`;

    return page(440, 280, css, body);
};

/**
 * Renders the 1400x560 marquee promo tile: one claim, one real screenshot.
 */
export const marquee = (icon: string, popup: string, popupWidth: number, popupHeight: number): string => {
    const css = `
    .marquee {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        gap: 80px;
        padding: 0 88px;
    }
    .copy { flex: 1; }
    .lockup {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 26px;
    }
    /* 32px is exactly a quarter of the 128px source — see the tile's note */
    .lockup img { width: 32px; height: 32px; }
    .lockup span {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--muted);
    }
    h1 { font-size: 60px; line-height: 65px; max-width: 15ch; }
    .sub {
        margin-top: 22px;
        font-size: 23px;
        line-height: 33px;
        color: var(--muted);
        max-width: 40ch;
    }
    .stage { flex: 0 0 ${popupWidth}px; display: flex; justify-content: center; }
`;

    const body = `<div class="marquee">
    <div class="copy">
        <div class="lockup"><img src="${icon}" alt=""><span>Extensions Update Tracker</span></div>
        <h1>Your extensions update silently. Now you&rsquo;ll know.</h1>
        <p class="sub">Update alerts, a full version history and an unread badge &mdash;
            all stored locally, no account, no tracking.</p>
    </div>
    <div class="stage">
        <img class="shot" src="${popup}" alt="" width="${popupWidth}" height="${popupHeight}"
            style="width:${popupWidth}px;height:${popupHeight}px">
    </div>
</div>`;

    return page(1400, 560, css, body);
};

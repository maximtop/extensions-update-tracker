/**
 * Demo dataset for the Chrome Web Store screenshots.
 *
 * The extension names here are invented. The store's listing requirements
 * forbid using other products' branding to promote your own, so the screenshots
 * must not show real extensions' names or icons — even though the UI itself is
 * the real, built one.
 *
 * Within that constraint the data is deliberately messy, because tidy data is
 * what makes a screenshot read as a fixture: real profiles have brand names of
 * wildly uneven length, version strings in four different schemes, updates that
 * cluster on one day and then go quiet for a month, and an unread item you
 * scrolled past a week ago sitting below things you have already read.
 */

import type { ExtensionInfo, ExtensionsUpdateStorageType } from '../../src/common/update-storage';

/**
 * One entry in a demo extension's update history.
 */
interface DemoVersion {
    version: string;
    /** How long before the frozen "now" this version was detected */
    agoMs: number;
    isRead: boolean;
}

/**
 * A demo extension: identity plus the versions it has shipped.
 */
interface DemoExtension {
    id: string;
    name: string;
    /** Complete inner SVG markup for a 48x48 icon, including its own ground */
    icon: string;
    /** Oldest first — the options page derives previous versions from this order */
    versions: DemoVersion[];
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * The instant the screenshots are taken at. Frozen so re-running the generator
 * produces byte-identical "2 hours ago" labels instead of a diff every time.
 */
export const FROZEN_NOW_MS = new Date('2026-03-12T14:20:00').getTime();

/**
 * Wraps an icon body in an SVG document and encodes it as a data URI.
 */
const iconDataUrl = (body: string): string => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">'
        + `${body}</svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Ten extensions, each with its own artwork rather than one parametrised plate.
 *
 * Real store icons vary in ground shape, palette depth and optical weight; six
 * identical rounded squares with a white line glyph is the single clearest tell
 * that a screenshot was staged.
 */
const DEMO_EXTENSIONS: DemoExtension[] = [
    {
        id: 'bkfmnhcpdlmkfibdmnhcpalkjfibdmna',
        name: 'picka — colour sampler',
        icon: '<circle cx="24" cy="24" r="24" fill="#F1F3F5"/>'
            + '<path d="M24 9c6 7.5 9.5 11.5 9.5 16A9.5 9.5 0 0 1 14.5 25c0-4.5 3.5-8.5 9.5-16z" fill="#E8590C"/>'
            + '<circle cx="24" cy="26.5" r="3.6" fill="#FFD8A8"/>',
        versions: [
            { version: '2.3.8', agoMs: 174 * DAY_MS, isRead: true },
            { version: '2.4.0', agoMs: 38 * DAY_MS, isRead: true },
            { version: '2.4.1', agoMs: 26 * MINUTE_MS, isRead: false },
        ],
    },
    {
        id: 'chchmldnjimlpcbnfhpalbomfegjimda',
        name: 'Kestrel Tab Suite',
        icon: '<defs><linearGradient id="k" x1="0" y1="0" x2="1" y2="1">'
            + '<stop offset="0" stop-color="#5C7CFA"/><stop offset="1" stop-color="#2B3EAD"/>'
            + '</linearGradient></defs>'
            + '<rect width="48" height="48" rx="12" fill="url(#k)"/>'
            + '<path d="M9 17h13v22H9z" fill="#fff" opacity=".5"/>'
            + '<path d="M24 11h15v28H24z" fill="#fff"/>',
        versions: [
            { version: '1.58.0.1', agoMs: 96 * DAY_MS, isRead: true },
            { version: '1.58.0.2', agoMs: 41 * DAY_MS, isRead: true },
            { version: '1.59.0.0', agoMs: 2 * HOUR_MS, isRead: false },
        ],
    },
    {
        id: 'djfkgabcnfhkelmdibhpankfgcbldmoe',
        name: 'JSONFox',
        icon: '<rect width="48" height="48" rx="10" fill="#1F2933"/>'
            + '<path d="M20 13c-4.5 0-3.5 8.5-6.5 11 3 2.5 2 11 6.5 11" stroke="#F59F00" stroke-width="3.2"'
            + ' fill="none" stroke-linecap="round"/>'
            + '<path d="M28 13c4.5 0 3.5 8.5 6.5 11-3 2.5-2 11-6.5 11" stroke="#F59F00" stroke-width="3.2"'
            + ' fill="none" stroke-linecap="round"/>',
        versions: [
            { version: '1.9.2', agoMs: 63 * DAY_MS, isRead: true },
            { version: '1.9.3', agoMs: 5 * HOUR_MS, isRead: false },
        ],
    },
    {
        id: 'ekmpbdlgohcjdmnfhalkbpdjfienchmb',
        name: 'Vaultwise Password Manager',
        icon: '<defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1">'
            + '<stop offset="0" stop-color="#37B24D"/><stop offset="1" stop-color="#1B6B2E"/>'
            + '</linearGradient></defs>'
            + '<path d="M24 2 44 9v15c0 12-8.5 19.5-20 24C12.5 43.5 4 36 4 24V9z" fill="url(#v)"/>'
            + '<rect x="17" y="22" width="14" height="11.5" rx="3" fill="#fff"/>'
            + '<path d="M20 22v-3.2a4 4 0 0 1 8 0V22" stroke="#fff" stroke-width="2.6" fill="none"/>',
        versions: [
            { version: '3.9.1', agoMs: 201 * DAY_MS, isRead: true },
            { version: '3.9.5', agoMs: 168 * DAY_MS, isRead: true },
            { version: '3.9.7', agoMs: 133 * DAY_MS, isRead: true },
            { version: '4.0.0', agoMs: 96 * DAY_MS, isRead: true },
            { version: '4.0.1', agoMs: 62 * DAY_MS, isRead: true },
            { version: '4.0.2', agoMs: 41 * DAY_MS, isRead: true },
            { version: '4.0.3', agoMs: 9 * DAY_MS, isRead: true },
            { version: '4.0.4', agoMs: 26 * HOUR_MS, isRead: true },
        ],
    },
    {
        id: 'fhalkbncjdmpegkbdlmnahcpfjeibdlk',
        name: 'Readably',
        icon: '<rect width="48" height="48" fill="#F8F1E5"/>'
            + '<path d="M11 12h12.5v25H11z" fill="#7048E8" opacity=".22"/>'
            + '<path d="M24.5 12H37v25H24.5z" fill="#7048E8"/>'
            + '<path d="M24 10v29" stroke="#5F3DC4" stroke-width="2"/>',
        versions: [
            { version: '3.1', agoMs: 88 * DAY_MS, isRead: true },
            // Left unread on purpose: a real queue holds something you scrolled
            // past days ago, sitting below newer items you have already read
            { version: '3.2', agoMs: 9 * DAY_MS, isRead: false },
        ],
    },
    {
        id: 'gjmpdlkbnfhecaidmlbpnkjfhgcbadle',
        name: 'Snapline Screenshot & Scroll Capture',
        icon: '<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1">'
            + '<stop offset="0" stop-color="#22B8CF"/><stop offset="1" stop-color="#0B7285"/>'
            + '</linearGradient></defs>'
            + '<circle cx="24" cy="24" r="23" fill="url(#s)"/>'
            + '<path d="M17 14v20M31 14v20M14 17h20M14 31h20" stroke="#fff" stroke-width="2.4"'
            + ' stroke-linecap="round" opacity=".75"/>'
            + '<rect x="19" y="19" width="10" height="10" fill="#fff"/>',
        versions: [
            { version: '2025.11.4', agoMs: 128 * DAY_MS, isRead: true },
            { version: '2026.1.19', agoMs: 52 * DAY_MS, isRead: true },
            { version: '2026.2.11', agoMs: 29 * DAY_MS, isRead: true },
        ],
    },
    {
        id: 'hakcbdfmnelpgjidmbknhaclpfjegbmd',
        name: 'Lumen Dark Mode',
        icon: '<circle cx="24" cy="24" r="24" fill="#10131A"/>'
            + '<path d="M28.5 10a15 15 0 1 0 9.5 22A16 16 0 0 1 28.5 10z" fill="#FFD43B"/>',
        versions: [
            { version: '4.2.0', agoMs: 17 * DAY_MS, isRead: true },
        ],
    },
    {
        id: 'idmbcplhnkfagjedlmbpnahckfjgbdle',
        name: 'Magpie Coupon Finder',
        icon: '<rect width="48" height="48" rx="14" fill="#C2255C"/>'
            + '<path d="M25 9 39 23 26 36 12 22V9z" fill="#fff" opacity=".92"/>'
            + '<circle cx="19" cy="16" r="3.2" fill="#C2255C"/>',
        versions: [
            { version: '6.4.0', agoMs: 24 * DAY_MS, isRead: true },
            { version: '6.5.0', agoMs: 3 * DAY_MS, isRead: true },
            // Three hours after 6.5.0 — the shape of a real hotfix
            { version: '6.5.1', agoMs: 3 * DAY_MS - 3 * HOUR_MS, isRead: true },
        ],
    },
    {
        id: 'jbdmlkfhcanpgeidmblkhnacpfjedbla',
        name: 'Meetly Calendar Sidebar',
        icon: '<rect width="48" height="48" rx="9" fill="#fff" stroke="#DEE2E6" stroke-width="2"/>'
            + '<rect x="9" y="14" width="30" height="25" rx="4" fill="#1971C2"/>'
            + '<path d="M9 21h30" stroke="#fff" stroke-width="2.4"/>'
            + '<path d="M16 10v7M32 10v7" stroke="#1971C2" stroke-width="3.4" stroke-linecap="round"/>',
        versions: [
            { version: '0.9.87', agoMs: 145 * DAY_MS, isRead: true },
            { version: '0.9.90', agoMs: 41 * DAY_MS, isRead: true },
        ],
    },
    {
        id: 'kcfmbdlnhapejgidbmlknchafpjedblm',
        name: 'Zenmark Bookmark Manager',
        icon: '<defs><linearGradient id="z" x1="0" y1="0" x2="1" y2="1">'
            + '<stop offset="0" stop-color="#9C36B5"/><stop offset="1" stop-color="#5F3DC4"/>'
            + '</linearGradient></defs>'
            + '<rect width="48" height="48" rx="11" fill="url(#z)"/>'
            + '<path d="M17 10h14v28l-7-6.5-7 6.5z" fill="#fff"/>',
        versions: [
            { version: '5.0.2', agoMs: 78 * DAY_MS, isRead: true },
            { version: '5.1.0', agoMs: 9 * DAY_MS, isRead: true },
        ],
    },
];

/**
 * The extension whose card the version-history screenshot zooms into.
 *
 * Vaultwise has the deepest history, so the card shows both the "show all
 * versions" affordance and a version scheme that ran across a major bump.
 */
export const HISTORY_SHOWCASE_NAME = 'Vaultwise Password Manager';

/**
 * A version route that actually exists in the data, for the promo tile.
 *
 * Advertising a pair that appears nowhere in the screenshots is a small lie
 * that a careful reader can catch.
 */
export const PROMO_VERSION_ROUTE = '1.9.2 → 1.9.3';

/**
 * Builds the storage payload the mocked `GetUpdates` message answers with.
 */
export const buildDemoStorage = (): ExtensionsUpdateStorageType => {
    const storage: ExtensionsUpdateStorageType = {};

    for (const extension of DEMO_EXTENSIONS) {
        const icons = [{ size: 48, url: iconDataUrl(extension.icon) }];

        storage[extension.id] = {
            currentVersion: extension.versions[extension.versions.length - 1].version,
            updateHistory: extension.versions.map((entry, index) => ({
                version: entry.version,
                detectedTimestampMs: FROZEN_NOW_MS - entry.agoMs,
                isRead: entry.isRead,
                previousVersion: index > 0 ? extension.versions[index - 1].version : undefined,
                infoSnapshot: { name: extension.name, icons },
            })),
        };
    }

    return storage;
};

/**
 * Builds the management-API payload the mocked `GetExtensionsInfo` answers with.
 *
 * `installType` is `normal` because that is what a store-installed extension
 * reports — an unpacked build would render a "LOCAL" badge on every card and a
 * store listing should show what users will actually see.
 */
export const buildDemoExtensionsInfo = (): Record<string, ExtensionInfo> => {
    const info: Record<string, ExtensionInfo> = {};

    for (const extension of DEMO_EXTENSIONS) {
        info[extension.id] = {
            id: extension.id,
            name: extension.name,
            version: extension.versions[extension.versions.length - 1].version,
            enabled: true,
            icons: [{ size: 48, url: iconDataUrl(extension.icon) }],
            installType: 'normal',
        };
    }

    return info;
};

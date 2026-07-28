/**
 * Update frequency analysis
 *
 * Turns a raw update history into the data the options page needs to show how
 * actively an extension is maintained: where each update sits on a timeline,
 * how long the gaps between them were, and — the part that decides whether an
 * extension looks abandoned — how long it has been silent since the last one.
 *
 * The axis runs to the present rather than to the newest release. An extension
 * whose history ends two years ago has the same release cadence as one shipped
 * last week; only the distance to today tells them apart.
 */

import { differenceInDays } from 'date-fns';

import { ExtensionUpdate } from '../update-storage';

/**
 * Upper bounds, in days, of each step of the gap ramp. A gap longer than the
 * last bound falls into the final step.
 *
 * These are steps of one continuous scale, not named categories: a 29-day gap
 * and a 31-day gap are neighbours, and the ramp colours them as such.
 */
export const GAP_LEVEL_BOUNDS = [30, 60, 120] as const;

/**
 * Days of silence after which an extension reads as slowing down
 */
export const SLOWING_AFTER_DAYS = 60;

/**
 * Days of silence after which an extension reads as dormant
 */
export const DORMANT_AFTER_DAYS = 180;

/**
 * Step of the gap ramp, 1 (shortest gaps) through 4 (longest)
 */
export type GapLevel = 1 | 2 | 3 | 4;

/**
 * What the silence since the last update says about the extension
 */
export type Staleness = 'current' | 'slowing' | 'dormant';

/**
 * A single update placed on the timeline
 */
export interface TimelinePoint {
    /** When the update was detected */
    date: Date;
    /** ISO date string the point was built from, for `dateTime` attributes */
    dateString: string;
    version: string;
    previousVersion?: string;
    /** Full days since the previous update, or null for the first one */
    daysSincePrevious: number | null;
    /** Ramp step for the gap that preceded this update, null for the first one */
    level: GapLevel | null;
    /** Horizontal position on the timeline, 0-100 percent */
    position: number;
}

/**
 * The stretch of time between two consecutive updates
 */
export interface TimelineSegment {
    /** Stable identity of the segment, taken from the update it leads to */
    id: string;
    /** Position of the earlier update, 0-100 percent */
    start: number;
    /** Position of the later update, 0-100 percent */
    end: number;
    days: number;
    level: GapLevel;
}

/**
 * The open stretch running from the newest update to the present
 */
export interface SilenceSegment {
    /** Position of the newest update, 0-100 percent; the stretch ends at 100 */
    start: number;
    days: number;
    status: Staleness;
}

/**
 * Everything the timeline renders, derived from one extension's update history
 */
export interface UpdateFrequency {
    points: TimelinePoint[];
    segments: TimelineSegment[];
    /** Null only when there are no updates at all */
    silence: SilenceSegment | null;
    /** Mean gap between updates in days, or null with fewer than two updates */
    averageDaysBetweenUpdates: number | null;
    oldestUpdate: Date | null;
    newestUpdate: Date | null;
    /** Days from the first update to now */
    spanDays: number;
}

const EMPTY_FREQUENCY: UpdateFrequency = {
    points: [],
    segments: [],
    silence: null,
    averageDaysBetweenUpdates: null,
    oldestUpdate: null,
    newestUpdate: null,
    spanDays: 0,
};

/**
 * Places a gap on the ramp
 *
 * @param days Full days between two consecutive updates
 * @returns Ramp step, 1 for the shortest gaps through 4 for the longest
 */
export function getGapLevel(days: number): GapLevel {
    if (days <= GAP_LEVEL_BOUNDS[0]) {
        return 1;
    }
    if (days <= GAP_LEVEL_BOUNDS[1]) {
        return 2;
    }
    if (days <= GAP_LEVEL_BOUNDS[2]) {
        return 3;
    }
    return 4;
}

/**
 * Rates how long an extension has gone without an update
 *
 * @param daysSinceLastUpdate Full days between the newest update and now
 * @returns Whether the extension reads as current, slowing, or dormant
 */
export function getStaleness(daysSinceLastUpdate: number): Staleness {
    if (daysSinceLastUpdate <= SLOWING_AFTER_DAYS) {
        return 'current';
    }
    if (daysSinceLastUpdate <= DORMANT_AFTER_DAYS) {
        return 'slowing';
    }
    return 'dormant';
}

/**
 * Rounds a percentage to two decimals so positions stay stable in the DOM
 * instead of churning on floating point noise
 */
function toPercent(value: number): number {
    return Math.round(value * 100) / 100;
}

/**
 * Analyses an extension's update history for the timeline
 *
 * Updates are sorted oldest first and spread across the axis in proportion to
 * when they happened, with the right edge of the axis being `now` — so the
 * silence since the last release takes up real width. Entries with an
 * unparsable date are skipped rather than poisoning every position with NaN.
 *
 * @param updates Update history of a single extension, in any order
 * @param now Right edge of the axis; defaults to the current time
 * @returns Points, gap segments, the trailing silence, and summary metrics
 *
 * @example
 * ```typescript
 * const { silence } = analyzeUpdateFrequency(updates);
 * // silence.days === 904, silence.status === 'dormant'
 * ```
 */
export function analyzeUpdateFrequency(updates: ExtensionUpdate[], now: Date = new Date()): UpdateFrequency {
    const sorted = updates
        .map((update) => ({ update, date: new Date(update.updateDate) }))
        .filter(({ date }) => !Number.isNaN(date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (sorted.length === 0) {
        return EMPTY_FREQUENCY;
    }

    const oldestUpdate = sorted[0].date;
    const newestUpdate = sorted[sorted.length - 1].date;

    // An update timestamped in the future would make the axis run backwards,
    // so the right edge never sits earlier than the newest update
    const axisEnd = Math.max(now.getTime(), newestUpdate.getTime());
    const spanMs = axisEnd - oldestUpdate.getTime();

    const points: TimelinePoint[] = sorted.map(({ update, date }, index) => {
        const daysSincePrevious = index === 0
            ? null
            : differenceInDays(date, sorted[index - 1].date);

        // With a single same-instant history there is no span to spread over,
        // so the points sit in the middle rather than dividing by zero
        const position = spanMs === 0
            ? 50
            : toPercent(((date.getTime() - oldestUpdate.getTime()) / spanMs) * 100);

        return {
            date,
            dateString: update.updateDate,
            version: update.version,
            previousVersion: update.previousVersion,
            daysSincePrevious,
            level: daysSincePrevious === null ? null : getGapLevel(daysSincePrevious),
            position,
        };
    });

    const segments: TimelineSegment[] = points.slice(1).map((point, index) => ({
        id: `${point.version}-${point.dateString}`,
        start: points[index].position,
        end: point.position,
        // Points after the first always carry a gap, the null case is the first one
        days: point.daysSincePrevious ?? 0,
        level: point.level ?? 1,
    }));

    const daysSinceLastUpdate = differenceInDays(new Date(axisEnd), newestUpdate);

    const averageDaysBetweenUpdates = segments.length > 0
        ? Math.round(segments.reduce((total, segment) => total + segment.days, 0) / segments.length)
        : null;

    return {
        points,
        segments,
        silence: {
            start: points[points.length - 1].position,
            days: daysSinceLastUpdate,
            status: getStaleness(daysSinceLastUpdate),
        },
        averageDaysBetweenUpdates,
        oldestUpdate,
        newestUpdate,
        spanDays: differenceInDays(new Date(axisEnd), oldestUpdate),
    };
}

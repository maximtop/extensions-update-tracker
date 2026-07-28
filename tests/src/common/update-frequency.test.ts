/**
 * Covers the maths behind the update activity timeline: ordering, gap
 * measurement, ramp and staleness boundaries, and how points are spread across
 * an axis whose right edge is the present rather than the newest release.
 */

import { describe, it, expect } from 'vitest';

import { ExtensionUpdate } from '../../../src/common/update-storage';
import {
    analyzeUpdateFrequency,
    getGapLevel,
    getStaleness,
} from '../../../src/common/utils/update-frequency';

const makeUpdate = (version: string, updateDate: string, previousVersion?: string): ExtensionUpdate => ({
    extensionId: 'abcdefghijklmnopabcdefghijklmnop',
    version,
    previousVersion,
    updateDate,
    isRead: false,
});

/** Fixed "now" so positions and day counts never depend on the clock */
const NOW = new Date('2026-07-28T00:00:00.000Z');

describe('getGapLevel', () => {
    it('steps the ramp at the documented bounds', () => {
        expect(getGapLevel(0)).toBe(1);
        expect(getGapLevel(30)).toBe(1);
        expect(getGapLevel(31)).toBe(2);
        expect(getGapLevel(60)).toBe(2);
        expect(getGapLevel(61)).toBe(3);
        expect(getGapLevel(120)).toBe(3);
        expect(getGapLevel(121)).toBe(4);
    });
});

describe('getStaleness', () => {
    it('rates silence at the documented bounds', () => {
        expect(getStaleness(0)).toBe('current');
        expect(getStaleness(60)).toBe('current');
        expect(getStaleness(61)).toBe('slowing');
        expect(getStaleness(180)).toBe('slowing');
        expect(getStaleness(181)).toBe('dormant');
    });
});

describe('analyzeUpdateFrequency', () => {
    it('returns empty metrics for no updates', () => {
        const result = analyzeUpdateFrequency([], NOW);

        expect(result.points).toEqual([]);
        expect(result.segments).toEqual([]);
        expect(result.silence).toBeNull();
        expect(result.averageDaysBetweenUpdates).toBeNull();
    });

    it('sorts updates oldest first regardless of input order', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.2.0', '2026-03-01T00:00:00.000Z', '1.1.0'),
            makeUpdate('1.0.0', '2026-01-01T00:00:00.000Z'),
            makeUpdate('1.1.0', '2026-02-01T00:00:00.000Z', '1.0.0'),
        ], NOW);

        expect(result.points.map((point) => point.version)).toEqual(['1.0.0', '1.1.0', '1.2.0']);
        expect(result.oldestUpdate?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
        expect(result.newestUpdate?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });

    it('measures gaps in full days and averages them', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2026-01-01T00:00:00.000Z'),
            makeUpdate('1.1.0', '2026-01-11T00:00:00.000Z', '1.0.0'),
            makeUpdate('1.2.0', '2026-01-31T00:00:00.000Z', '1.1.0'),
        ], NOW);

        expect(result.points.map((point) => point.daysSincePrevious)).toEqual([null, 10, 20]);
        expect(result.averageDaysBetweenUpdates).toBe(15);
    });

    it('runs the axis to now, so the newest update stops short of the end', () => {
        // 100 days of history, then 100 days of silence: the last release lands halfway
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2026-01-09T00:00:00.000Z'),
            makeUpdate('1.1.0', '2026-04-19T00:00:00.000Z', '1.0.0'),
        ], NOW);

        expect(result.points[0].position).toBe(0);
        expect(result.points[1].position).toBe(50);
        expect(result.silence?.start).toBe(50);
        expect(result.silence?.days).toBe(100);
        expect(result.spanDays).toBe(200);
    });

    it('reports a healthy extension as current with a narrow silence', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2026-05-01T00:00:00.000Z'),
            makeUpdate('1.1.0', '2026-06-01T00:00:00.000Z', '1.0.0'),
            makeUpdate('1.2.0', '2026-07-19T00:00:00.000Z', '1.1.0'),
        ], NOW);

        expect(result.silence?.days).toBe(9);
        expect(result.silence?.status).toBe('current');
        expect(result.silence?.start).toBeGreaterThan(85);
    });

    it('reports an abandoned extension as dormant even when its cadence looked normal', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2023-01-16T00:00:00.000Z'),
            makeUpdate('1.1.0', '2023-03-06T00:00:00.000Z', '1.0.0'),
            makeUpdate('2.0.0', '2024-02-05T00:00:00.000Z', '1.1.0'),
        ], NOW);

        // The historical gaps are unremarkable — only the silence gives it away
        expect(result.averageDaysBetweenUpdates).toBe(193);
        expect(result.silence?.days).toBe(904);
        expect(result.silence?.status).toBe('dormant');
        // The dead stretch takes the majority of the track
        expect(result.silence?.start).toBeLessThan(35);
    });

    it('builds one segment per gap, joining consecutive points', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2026-01-01T00:00:00.000Z'),
            makeUpdate('1.1.0', '2026-01-21T00:00:00.000Z', '1.0.0'),
            makeUpdate('2.0.0', '2026-06-01T00:00:00.000Z', '1.1.0'),
        ], NOW);

        expect(result.segments).toHaveLength(2);
        expect(result.segments[0]).toMatchObject({ start: 0, days: 20, level: 1 });
        expect(result.segments[1]).toMatchObject({ days: 131, level: 4 });
        expect(result.segments[0].end).toBe(result.segments[1].start);
    });

    it('skips entries with an unparsable date instead of producing NaN positions', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2026-01-01T00:00:00.000Z'),
            makeUpdate('1.0.1', 'not a date'),
            makeUpdate('1.1.0', '2026-02-01T00:00:00.000Z', '1.0.1'),
        ], NOW);

        expect(result.points).toHaveLength(2);
        expect(result.points.every((point) => Number.isFinite(point.position))).toBe(true);
    });

    it('never runs the axis backwards when an update is timestamped in the future', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', '2026-07-01T00:00:00.000Z'),
            makeUpdate('1.1.0', '2027-01-01T00:00:00.000Z', '1.0.0'),
        ], NOW);

        expect(result.points.every((point) => point.position >= 0 && point.position <= 100)).toBe(true);
        expect(result.silence?.days).toBe(0);
        expect(result.silence?.status).toBe('current');
    });

    it('centres every point when the whole history shares one timestamp with now', () => {
        const result = analyzeUpdateFrequency([
            makeUpdate('1.0.0', NOW.toISOString()),
            makeUpdate('1.0.1', NOW.toISOString(), '1.0.0'),
        ], NOW);

        expect(result.points.map((point) => point.position)).toEqual([50, 50]);
        expect(result.silence?.days).toBe(0);
    });
});

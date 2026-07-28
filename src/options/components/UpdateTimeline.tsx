import React, { useMemo, useState } from 'react';

import { ExtensionUpdate } from '../../common/update-storage';
import { t, tPlural } from '../../common/utils/i18n';
import { formatDay, formatTimeAgo } from '../../common/utils/time';
import { analyzeUpdateFrequency, Staleness, TimelinePoint } from '../../common/utils/update-frequency';

interface UpdateTimelineProps {
    updates: ExtensionUpdate[];
}

const STALENESS_LABELS: Record<Staleness, string> = {
    current: 'options_timeline_status_current',
    slowing: 'options_timeline_status_slowing',
    dormant: 'options_timeline_status_dormant',
};

/**
 * Describes the gap that preceded an update, e.g. "31 days after v1.4.1".
 * The day count carries the meaning on its own, so the ramp shade of the track
 * stays redundant encoding rather than the only signal.
 */
function getGapText(point: TimelinePoint): string {
    if (point.daysSincePrevious === null) {
        return t('options_timeline_first_update');
    }
    if (point.previousVersion) {
        return tPlural(
            'options_timeline_gap_from_version',
            point.daysSincePrevious,
            { previous: point.previousVersion },
        );
    }
    return tPlural('options_timeline_gap', point.daysSincePrevious);
}

/**
 * Shows how actively an extension is maintained: every recorded update placed
 * on a time axis that runs to the present, so the stretch of silence since the
 * newest release takes up real width. Gaps are shaded on a single-hue ramp by
 * how long they were; the trailing stretch carries the one status colour, and
 * always states the verdict in words beneath it.
 *
 * Details for a single update surface in the axis row on hover or keyboard
 * focus, and clicking a point pins them so touch users can read them too.
 */
export function UpdateTimeline({ updates }: UpdateTimelineProps): React.JSX.Element | null {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

    const {
        points,
        segments,
        silence,
        averageDaysBetweenUpdates,
        oldestUpdate,
    } = useMemo(() => analyzeUpdateFrequency(updates), [updates]);

    // A single point has no gaps to show, which is the whole purpose of the timeline
    if (points.length < 2 || !silence) {
        return null;
    }

    const activeIndex = hoveredIndex ?? pinnedIndex;
    const activePoint = activeIndex === null ? null : points[activeIndex];

    const togglePinned = (index: number) => {
        setPinnedIndex(pinnedIndex === index ? null : index);
    };

    return (
        <div className="update-timeline">
            <div className="timeline-head">
                <span className="timeline-title">{t('options_timeline_title')}</span>
                {averageDaysBetweenUpdates !== null && (
                    <span className="timeline-average">
                        {tPlural('options_timeline_average', averageDaysBetweenUpdates)}
                    </span>
                )}
            </div>

            <div className="timeline-track">
                {segments.map((segment) => (
                    <span
                        key={`segment-${segment.id}`}
                        className={`timeline-segment level-${segment.level}`}
                        style={{ left: `${segment.start}%`, width: `${segment.end - segment.start}%` }}
                    />
                ))}
                <span
                    className={`timeline-silence staleness-${silence.status}`}
                    style={{ left: `${silence.start}%`, width: `${100 - silence.start}%` }}
                />
                {points.map((point, index) => (
                    <button
                        key={`${point.version}-${point.dateString}`}
                        type="button"
                        className={`timeline-point level-${point.level ?? 'initial'} ${activeIndex === index ? 'active' : ''}`}
                        style={{ left: `${point.position}%` }}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onFocus={() => setHoveredIndex(index)}
                        onBlur={() => setHoveredIndex(null)}
                        onClick={() => togglePinned(index)}
                        aria-pressed={pinnedIndex === index}
                        aria-label={t('options_timeline_point_aria', {
                            version: point.version,
                            date: formatDay(point.date),
                            detail: getGapText(point),
                        })}
                    />
                ))}
                <span className="timeline-now" aria-hidden="true" />
            </div>

            <div className="timeline-axis">
                {activePoint ? (
                    <span className="timeline-detail">
                        <span className="timeline-detail-version num">
                            {t('options_update_item_version')}
                            {' '}
                            {activePoint.version}
                        </span>
                        <time dateTime={activePoint.dateString}>{formatDay(activePoint.date)}</time>
                        <span className={`timeline-detail-gap level-${activePoint.level ?? 'initial'}`}>
                            {getGapText(activePoint)}
                        </span>
                    </span>
                ) : (
                    <>
                        {oldestUpdate && <span>{formatDay(oldestUpdate)}</span>}
                        <span>{t('options_timeline_today')}</span>
                    </>
                )}
            </div>

            {/* The verdict the timeline exists to deliver, in words rather than
                colour, so it survives both colour blindness and a glance */}
            <p className={`timeline-verdict staleness-${silence.status}`}>
                <span className="timeline-verdict-dot" aria-hidden="true" />
                <strong>
                    {t('options_timeline_last_update', {
                        time_ago: formatTimeAgo(points[points.length - 1].date.getTime()),
                    })}
                </strong>
                {' · '}
                {t(STALENESS_LABELS[silence.status])}
            </p>
        </div>
    );
}

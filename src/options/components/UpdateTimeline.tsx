import React, { useMemo, useState } from 'react';

import { ExtensionUpdate } from '../../common/update-storage';
import { t } from '../../common/utils/i18n';

interface UpdateTimelineProps {
    updates: ExtensionUpdate[];
}

interface TimelinePoint {
    date: Date;
    version: string;
    previousVersion?: string;
    daysSincePrevious: number | null;
    position: number; // 0-100 percentage position on timeline
}

interface TimelineMetrics {
    averageDaysBetweenUpdates: number | null;
    totalUpdates: number;
    timeSpanDays: number;
    oldestUpdate: Date | null;
    newestUpdate: Date | null;
}

/**
 * Calculates timeline data points from extension updates
 */
function calculateTimelineData(updates: ExtensionUpdate[]): {
    points: TimelinePoint[];
    metrics: TimelineMetrics;
} {
    if (updates.length === 0) {
        return {
            points: [],
            metrics: {
                averageDaysBetweenUpdates: null,
                totalUpdates: 0,
                timeSpanDays: 0,
                oldestUpdate: null,
                newestUpdate: null,
            },
        };
    }

    // Sort updates by date (oldest first for timeline)
    const sortedUpdates = [...updates].sort((a, b) => {
        return new Date(a.updateDate).getTime() - new Date(b.updateDate).getTime();
    });

    const dates = sortedUpdates.map((u) => new Date(u.updateDate));
    const oldestUpdate = dates[0];
    const newestUpdate = dates[dates.length - 1];

    // Calculate time span - use at least 30 days for better visualization
    const actualTimeSpanMs = newestUpdate.getTime() - oldestUpdate.getTime();
    const minTimeSpanMs = 30 * 24 * 60 * 60 * 1000; // 30 days minimum
    const timeSpanMs = Math.max(actualTimeSpanMs, minTimeSpanMs);
    const timeSpanDays = Math.ceil(timeSpanMs / (24 * 60 * 60 * 1000));

    // Calculate points with positions and gaps
    const points: TimelinePoint[] = sortedUpdates.map((update, index) => {
        const date = new Date(update.updateDate);

        // Calculate days since previous update
        let daysSincePrevious: number | null = null;
        if (index > 0) {
            const previousDate = dates[index - 1];
            daysSincePrevious = Math.round(
                (date.getTime() - previousDate.getTime()) / (24 * 60 * 60 * 1000),
            );
        }

        // Calculate position as percentage (0-100)
        // If only one update, center it
        let position: number;
        if (updates.length === 1) {
            position = 50;
        } else {
            position = ((date.getTime() - oldestUpdate.getTime()) / timeSpanMs) * 100;
            // Ensure first and last points have some padding
            position = Math.max(5, Math.min(95, position));
        }

        return {
            date,
            version: update.version,
            previousVersion: update.previousVersion,
            daysSincePrevious,
            position,
        };
    });

    // Calculate average days between updates
    let averageDaysBetweenUpdates: number | null = null;
    if (points.length > 1) {
        const gaps = points
            .map((p) => p.daysSincePrevious)
            .filter((d): d is number => d !== null);
        if (gaps.length > 0) {
            averageDaysBetweenUpdates = Math.round(
                gaps.reduce((sum, d) => sum + d, 0) / gaps.length,
            );
        }
    }

    return {
        points,
        metrics: {
            averageDaysBetweenUpdates,
            totalUpdates: updates.length,
            timeSpanDays,
            oldestUpdate,
            newestUpdate,
        },
    };
}

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Returns a color based on update frequency (days since previous)
 * Green = frequent updates, Yellow = moderate, Red = long gaps
 */
function getGapColor(daysSincePrevious: number | null): string {
    if (daysSincePrevious === null) {
        return '#6c757d'; // Gray for first update
    }
    if (daysSincePrevious <= 30) {
        return '#198754'; // Green - very active
    }
    if (daysSincePrevious <= 90) {
        return '#0d6efd'; // Blue - active
    }
    if (daysSincePrevious <= 180) {
        return '#ffc107'; // Yellow - moderate
    }
    return '#dc3545'; // Red - long gap
}

/**
 * UpdateTimeline component displays a visual timeline of extension updates
 * showing when updates occurred and the gaps between them.
 */
export function UpdateTimeline({ updates }: UpdateTimelineProps): React.ReactNode {
    const [hoveredPoint, setHoveredPoint] = useState<TimelinePoint | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    const { points, metrics } = useMemo(() => calculateTimelineData(updates), [updates]);

    // Don't render if no updates
    if (points.length === 0) {
        return null;
    }

    const handleMouseEnter = (point: TimelinePoint, event: React.MouseEvent) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setHoveredPoint(point);
        setTooltipPosition({
            x: rect.left + rect.width / 2,
            y: rect.top,
        });
    };

    const handleMouseLeave = () => {
        setHoveredPoint(null);
    };

    return (
        <div className="update-timeline">
            <div className="timeline-header">
                <span className="timeline-title">{t('options_timeline_title')}</span>
                {metrics.averageDaysBetweenUpdates !== null && (
                    <span className="timeline-metric">
                        {t('options_timeline_avg_days', metrics.averageDaysBetweenUpdates.toString())}
                    </span>
                )}
            </div>

            <div className="timeline-container">
                {/* Timeline track */}
                <div className="timeline-track">
                    {/* Timeline points */}
                    {points.map((point, index) => (
                        <div
                            key={`${point.version}-${point.date.getTime()}`}
                            className="timeline-point-wrapper"
                            style={{ left: `${point.position}%` }}
                            onMouseEnter={(e) => handleMouseEnter(point, e)}
                            onMouseLeave={handleMouseLeave}
                            onFocus={(e) => handleMouseEnter(point, e as unknown as React.MouseEvent)}
                            onBlur={handleMouseLeave}
                            tabIndex={0}
                            role="button"
                            aria-label={`${t('options_timeline_version')} ${point.version}, ${formatDate(point.date)}`}
                        >
                            <div
                                className="timeline-point"
                                style={{ backgroundColor: getGapColor(point.daysSincePrevious) }}
                            />
                            {/* Gap indicator line to previous point */}
                            {index > 0 && (
                                <div
                                    className="timeline-gap-line"
                                    style={{
                                        width: `${point.position - points[index - 1].position}%`,
                                        left: `${points[index - 1].position - point.position}%`,
                                        backgroundColor: getGapColor(point.daysSincePrevious),
                                        opacity: 0.3,
                                    }}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Time labels */}
                <div className="timeline-labels">
                    {metrics.oldestUpdate && (
                        <span className="timeline-label timeline-label-start">
                            {formatDate(metrics.oldestUpdate)}
                        </span>
                    )}
                    {metrics.newestUpdate && metrics.oldestUpdate
                        && metrics.newestUpdate.getTime() !== metrics.oldestUpdate.getTime() && (
                        <span className="timeline-label timeline-label-end">
                            {formatDate(metrics.newestUpdate)}
                        </span>
                    )}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredPoint && (
                <div
                    className="timeline-tooltip"
                    style={{
                        position: 'fixed',
                        left: tooltipPosition.x,
                        top: tooltipPosition.y - 10,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <div className="tooltip-version">
                        v
                        {hoveredPoint.version}
                    </div>
                    <div className="tooltip-date">{formatDate(hoveredPoint.date)}</div>
                    {hoveredPoint.previousVersion && (
                        <div className="tooltip-previous">
                            {t('options_timeline_from_version', hoveredPoint.previousVersion)}
                        </div>
                    )}
                    {hoveredPoint.daysSincePrevious !== null && (
                        <div
                            className="tooltip-gap"
                            style={{ color: getGapColor(hoveredPoint.daysSincePrevious) }}
                        >
                            {t('options_timeline_days_gap', hoveredPoint.daysSincePrevious.toString())}
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="timeline-legend">
                <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#198754' }} />
                    <span className="legend-text">&lt;30d</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#0d6efd' }} />
                    <span className="legend-text">30-90d</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#ffc107' }} />
                    <span className="legend-text">90-180d</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: '#dc3545' }} />
                    <span className="legend-text">&gt;180d</span>
                </div>
            </div>
        </div>
    );
}

/**
 * Time-related utility functions
 */

import {
    differenceInDays,
    differenceInHours,
    differenceInMinutes,
    format,
} from 'date-fns';

import { t, tPlural } from './i18n';

/**
 * Formats a Date object to a readable timestamp string for logging.
 * Format: HH:MM:SS.mmm (24-hour format with milliseconds)
 *
 * @param date - Date object to format
 *
 * @returns Formatted time string (e.g., "14:35:42.123")
 *
 * @example
 * ```typescript
 * const now = new Date();
 * formatTime(now); // "14:35:42.123"
 * ```
 */
export function formatTime(date: Date): string {
    return format(date, 'HH:mm:ss.SSS');
}

/**
 * Formats a date string to a localized display string
 *
 * @param dateString - ISO date string or any valid date string
 * @returns Formatted date string (e.g., "Jan 15, 2024, 2:30 PM")
 *
 * @example
 * ```typescript
 * formatDate("2024-01-15T14:30:00.000Z"); // "Jan 15, 2024, 2:30 PM"
 * ```
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

/**
 * Formats a timestamp into a localized "time ago" string
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time ago string (e.g., "5 minutes ago", "2 hours ago")
 *
 * @example
 * ```typescript
 * const timestamp = Date.now() - 300000; // 5 minutes ago
 * formatTimeAgo(timestamp); // "5 minutes ago"
 * ```
 */
export function formatTimeAgo(timestamp: number): string {
    const now = new Date();
    const date = new Date(timestamp);

    const minutes = differenceInMinutes(now, date);
    const hours = differenceInHours(now, date);
    const days = differenceInDays(now, date);

    // For very recent times (less than 1 minute), show "just now"
    if (minutes < 1) {
        return t('common_time_just_now');
    }

    if (minutes < 60) {
        return tPlural('common_time_minutes_ago', minutes);
    }

    if (hours < 24) {
        return tPlural('common_time_hours_ago', hours);
    }

    return tPlural('common_time_days_ago', days);
}

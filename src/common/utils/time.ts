/**
 * Time-related utility functions
 */

import { t } from './i18n';

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
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
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
    const now = Date.now();
    const diff = now - timestamp;

    // For very recent times (less than 1 minute), show "just now"
    const oneMinute = 60 * 1000;
    if (diff < oneMinute) {
        return t('common_time_just_now');
    }

    const minutes = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    // Use i18n for proper pluralization
    if (minutes < 60) {
        const unit = minutes === 1 ? t('common_time_minute') : t('common_time_minutes');
        return `${minutes} ${unit} ${t('common_time_ago')}`;
    }

    if (hours < 24) {
        const unit = hours === 1 ? t('common_time_hour') : t('common_time_hours');
        return `${hours} ${unit} ${t('common_time_ago')}`;
    }

    const unit = days === 1 ? t('common_time_day') : t('common_time_days');
    return `${days} ${unit} ${t('common_time_ago')}`;
}

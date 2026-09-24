/**
 * @file Storage key with its default value and optional validation schema.
 */

import type * as v from 'valibot';

/**
 * Storage key configuration with valibot schema for validation
 *
 * @example
 * import * as v from 'valibot';
 *
 * const STATES_KEY = new StorageKey(
 *     'notification_states',
 *     {},
 *     v.record(v.string(), v.object({
 *         extensionId: v.string(),
 *         version: v.string(),
 *         // ... more fields
 *     }))
 * );
 */
export class StorageKey<T> {
    /**
     * Creates a storage key descriptor.
     *
     * @param key Raw key the value is stored under in `browser.storage.local`.
     * @param defaultValue Value returned when the key is missing or fails validation.
     * @param schema Valibot schema the stored value is validated against; when omitted,
     * the stored value is returned as-is.
     */
    constructor(
        public readonly key: string,
        public readonly defaultValue: T,
        public readonly schema?: v.BaseSchema<T, T, v.BaseIssue<unknown>>,
    ) {}
}

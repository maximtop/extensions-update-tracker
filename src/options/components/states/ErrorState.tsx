/**
 * @file Error state shown on the Updates tab when loading updates or settings failed.
 */

import React from 'react';

/**
 * Props for ErrorState.
 */
interface ErrorStateProps {
    /**
     * Human-readable error message to display.
     */
    error: string;
}

/**
 * Error state component displayed when there's an error loading updates
 *
 * @param root0 Component props.
 * @param root0.error Human-readable error message to display.
 */
export function ErrorState({ error }: ErrorStateProps): JSX.Element {
    return (
        <div className="error-state">
            <div className="state-inner" role="alert">
                <p>{error}</p>
            </div>
        </div>
    );
}

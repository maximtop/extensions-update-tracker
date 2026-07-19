import React from 'react';

interface ErrorStateProps {
    error: string;
}

/**
 * Error state component displayed when there's an error loading updates
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

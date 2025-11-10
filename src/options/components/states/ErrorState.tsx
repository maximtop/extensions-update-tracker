import React from 'react';

import { t } from '../../../common/utils/i18n';

interface ErrorStateProps {
    error: string;
}

/**
 * Error state component displayed when there's an error loading updates
 */
export function ErrorState({ error }: ErrorStateProps): JSX.Element {
    return (
        <>
            <h1>{t('options_page_title')}</h1>
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        </>
    );
}

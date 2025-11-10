import React from 'react';

import { t } from '../../../common/utils/i18n';

/**
 * Loading state component displayed while fetching extension updates
 */
export function LoadingState(): React.JSX.Element {
    return (
        <>
            <h1>{t('options_page_title')}</h1>
            {/* Min height ensures loading spinner is visible and doesn't cause layout shift */}
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">{t('options_loading')}</span>
                </div>
            </div>
        </>
    );
}

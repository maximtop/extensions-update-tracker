import React from 'react';

import { t } from '../../common/utils/i18n';

/**
 * Page heading with title and short utility description
 */
export function PageHeader(): React.JSX.Element {
    return (
        <div className="page-heading">
            <h1>{t('options_page_title')}</h1>
            <p className="lead">{t('options_page_lead')}</p>
        </div>
    );
}

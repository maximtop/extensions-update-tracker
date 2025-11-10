import React from 'react';

import { t } from '../../common/utils/i18n';

/**
 * Page header with title
 */
export function PageHeader(): React.JSX.Element {
    return (
        <div>
            <h1>{t('options_page_title')}</h1>
        </div>
    );
}

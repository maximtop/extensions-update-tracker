import React from 'react';

import { t } from '../../../common/utils/i18n';

/**
 * Empty state component displayed when there are no extension updates
 */
export function EmptyState(): React.JSX.Element {
    return (
        <>
            <h1>{t('options_page_title')}</h1>
            <div className="alert alert-info text-center" role="alert">
                <p className="mb-0">{t('options_empty_no_updates')}</p>
                <small className="text-muted">{t('options_empty_install_hint')}</small>
            </div>
        </>
    );
}

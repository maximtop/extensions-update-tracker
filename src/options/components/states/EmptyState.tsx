import React from 'react';

import { t } from '../../../common/utils/i18n';

/**
 * Empty state component displayed when there are no extension updates
 */
export function EmptyState(): React.JSX.Element {
    return (
        <div className="empty-state">
            <div className="state-inner" role="status">
                <h2>{t('options_empty_no_updates')}</h2>
                <p>{t('options_empty_install_hint')}</p>
            </div>
        </div>
    );
}

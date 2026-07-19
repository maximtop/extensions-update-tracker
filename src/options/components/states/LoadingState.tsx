import React from 'react';

import { t } from '../../../common/utils/i18n';

/**
 * Loading state component displayed while fetching extension updates.
 * Skeleton ledger rows keep the layout stable while data loads.
 */
export function LoadingState(): React.JSX.Element {
    return (
        <div className="loading-state">
            <div className="state-inner" role="status" aria-live="polite">
                <span className="sr-only">{t('options_loading')}</span>
                <div className="loading-ledger" aria-hidden="true">
                    {[0, 1, 2].map((index) => (
                        <div className="loading-row" key={index}>
                            <span className="loading-icon" />
                            <span className="loading-lines">
                                <span />
                                <span />
                            </span>
                            <span className="loading-date" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

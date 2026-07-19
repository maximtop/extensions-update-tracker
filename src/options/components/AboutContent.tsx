import React from 'react';
import browser from 'webextension-polyfill';

import { t } from '../../common/utils/i18n';

const GITHUB_URL = 'https://github.com/maximtop/extensions-update-tracker';
const ISSUES_URL = `${GITHUB_URL}/issues`;
const LICENSE_URL = `${GITHUB_URL}/blob/master/LICENSE`;
const WEB_STORE_URL = 'https://chromewebstore.google.com/detail/cdgepknigaiclfdmjckaknepgcighbnh';

const AUTHOR_NAME = 'Maxim Topciu';

interface LinkRowProps {
    href: string;
    title: string;
    description: string;
}

/**
 * A single external link row, visually matching the settings switch-list rows
 */
function LinkRow({ href, title, description }: LinkRowProps): React.JSX.Element {
    return (
        <a className="about-link-row" href={href} target="_blank" rel="noopener noreferrer">
            <span>
                <span className="switch-title">{title}</span>
                <span className="switch-description">{description}</span>
            </span>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
            >
                <path d="M7 17 17 7M9 7h8v8" />
            </svg>
        </a>
    );
}

/**
 * About tab content: extension identity, useful links, privacy note, and credits
 */
export function AboutContent(): React.JSX.Element {
    const { version } = browser.runtime.getManifest();

    return (
        <>
            <section className="settings-section">
                <p className="about-lead">{t('description')}</p>
            </section>

            <section className="settings-section">
                <h2>{t('options_about_section_resources')}</h2>
                <div className="switch-list">
                    <LinkRow
                        href={GITHUB_URL}
                        title={t('options_about_github')}
                        description={t('options_about_github_desc')}
                    />
                    <LinkRow
                        href={ISSUES_URL}
                        title={t('options_about_report_issue')}
                        description={t('options_about_report_issue_desc')}
                    />
                    <LinkRow
                        href={WEB_STORE_URL}
                        title={t('options_about_rate')}
                        description={t('options_about_rate_desc')}
                    />
                </div>
            </section>

            <section className="settings-section">
                <p className="settings-section-desc">{t('options_about_privacy_desc')}</p>
                <p className="about-credits">
                    {t('options_about_version', { version })}
                    {' · '}
                    {t('options_about_author', { author: AUTHOR_NAME })}
                    {' · '}
                    <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">
                        {t('options_about_license')}
                    </a>
                </p>
            </section>
        </>
    );
}

// @vitest-environment node

/**
 * @file Exercise the deployment preparation protocol against simulated GitHub and Git responses.
 * Repository specifics come from scripts/deploy/constants.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import AdmZip from 'adm-zip';
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    AMO_APPROVAL_NOTES_FILENAME,
    AMO_APPROVAL_NOTES_OWN_LIMIT,
    AMO_REVIEW_NOTES_PATH,
    GECKO_ID,
    RELEASE_ASSET_PREFIX,
    SOURCE_REQUIRED_FILES,
    Store,
    STORE_TARGETS,
    STORE_UPLOAD_DIRECTORY,
} from '../../scripts/deploy/constants';
import { DeployMode, prepare } from '../../scripts/deploy/prepare';
import { amoNotesLength } from '../../scripts/deploy/release';

import type * as DeployConstants from '../../scripts/deploy/constants';

const notesLimit = vi.hoisted(() => ({ override: undefined as number | undefined }));

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('../../scripts/deploy/constants', async (original) => {
    const actual = await original<typeof DeployConstants>();
    return {
        ...actual,
        // Lets a test shrink the limit below the generated notes; `undefined` keeps the real one.
        get AMO_APPROVAL_NOTES_OWN_LIMIT(): number {
            return notesLimit.override ?? actual.AMO_APPROVAL_NOTES_OWN_LIMIT;
        },
    };
});
vi.mock('node:fs', async (original) => ({
    ...await original<Record<string, unknown>>(),
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

const STORE_CONFIG: Record<string, Record<string, string>> = {
    chrome: {
        CHROME_APP_ID: 'fixture-item',
        CHROME_PUBLISHER_ID: 'fixture-publisher',
        CHROME_CLIENT_ID: 'fixture-client',
        CHROME_CLIENT_SECRET: 'fixture-secret',
        CHROME_REFRESH_TOKEN: 'fixture-token',
    },
    edge: {
        EDGE_PRODUCT_ID: 'fixture-product',
        EDGE_CLIENT_ID: 'fixture-client',
        EDGE_API_KEY: 'fixture-key',
    },
    firefox: {
        FIREFOX_AMO_ID: 'fixture',
        FIREFOX_CLIENT_ID: 'fixture-issuer',
        FIREFOX_CLIENT_SECRET: 'fixture-secret',
    },
};
const UNSUPPORTED_MODE: Record<string, string> = {
    chrome: 'upload', edge: 'status', firefox: 'upload',
};
const envFor = (target: string, mode = 'submit'): NodeJS.ProcessEnv => ({
    GITHUB_REPOSITORY: 'fixture/repository',
    GITHUB_OUTPUT: 'fixture-output',
    GH_TOKEN: 'fixture-token',
    STORE_TARGET: target,
    DEPLOY_MODE: mode,
    ...STORE_CONFIG[target],
});
const pack = (files: Record<string, string>): Buffer => {
    const zip = new AdmZip();
    Object.entries(files).forEach(([name, value]) => {
        zip.addFile(name, Buffer.from(value));
    });
    return zip.toBuffer();
};
const chromiumPackage = pack({
    'manifest.json': JSON.stringify({
        manifest_version: 3,
        version: '1.2.3',
        background: { service_worker: 'background.js' },
    }),
});
const firefoxPackage = pack({
    'manifest.json': JSON.stringify({
        manifest_version: 3,
        version: '1.2.3',
        browser_specific_settings: { gecko: { id: GECKO_ID } },
        background: { scripts: ['background.js'] },
    }),
});
const sourceFiles = {
    ...Object.fromEntries(SOURCE_REQUIRED_FILES.map((file) => [file, 'fixture'])),
    'package.json': JSON.stringify({ version: '1.2.3' }),
};
const REVIEW_INSTRUCTIONS = 'Reviewer instructions';
const sourcePackage = pack({ ...sourceFiles, [AMO_REVIEW_NOTES_PATH]: REVIEW_INSTRUCTIONS });
const assetName = (kind: string): string => `${RELEASE_ASSET_PREFIX}-1.2.3-${kind}.zip`;
const downloadArguments = (): string[] | undefined => vi.mocked(execFileSync).mock.calls
    .find(([file, args]) => file === 'gh' && args?.[1] === 'download')?.[1] as string[] | undefined;
let assets: Record<string, Buffer>;
let release = { tagName: 'v1.2.3', isDraft: false, isPrerelease: false };

beforeEach(() => {
    vi.resetAllMocks();
    notesLimit.override = undefined;
    release = { tagName: 'v1.2.3', isDraft: false, isPrerelease: false };
    assets = {
        [assetName('chrome')]: chromiumPackage,
        [assetName('edge')]: chromiumPackage,
        [assetName('firefox')]: firefoxPackage,
        [assetName('source')]: sourcePackage,
    };
    vi.mocked(execFileSync).mockImplementation((file, args) => {
        const command = `${file} ${(args as string[]).join(' ')}`;
        if (command.startsWith('gh release view')) {
            return JSON.stringify(release);
        }
        if (command.startsWith('git rev-parse')) {
            return 'fixture-commit';
        }
        if (command.startsWith('git show')) {
            return '{"version":"1.2.3"}';
        }
        return '';
    });
    vi.mocked(readFileSync).mockImplementation((file) => {
        const name = path.basename(String(file));
        if (name === 'SHA256SUMS.txt') {
            return Object.entries(assets)
                .map(([asset, bytes]) => {
                    return `${createHash('sha256').update(bytes).digest('hex')}  ${asset}`;
                })
                .join('\n');
        }
        return Buffer.from(assets[name] ?? '');
    });
});

describe.each(STORE_TARGETS)('release preparation protocol for %s', (target) => {
    it('resolves latest once, pins every download to that tag and names the asset', () => {
        prepare(envFor(target));
        const views = vi.mocked(execFileSync).mock.calls
            .filter(([file, args]) => file === 'gh' && args?.[1] === 'view');
        expect(views).toHaveLength(1);
        expect(views[0]?.[1] ?? []).not.toContain('v1.2.3');
        expect(downloadArguments()).toContain('v1.2.3');
        expect(downloadArguments()).toContain(assetName(target));
        const outputs = `asset=${assetName(target)}\nsource=${assetName('source')}\n`;
        expect(appendFileSync).toHaveBeenCalledWith(
            'fixture-output',
            `tag=v1.2.3\nversion=1.2.3\n${outputs}`,
        );
    });
    it('refuses malformed input and unsupported modes before invoking external tools', () => {
        expect(() => {
            prepare({ ...envFor(target), INPUT_TAG: '--latest' });
        }).toThrow('vX.Y.Z');
        expect(() => {
            prepare(envFor(target, UNSUPPORTED_MODE[target] ?? ''));
        }).toThrow('mode');
        expect(execFileSync).not.toHaveBeenCalled();
    });
    it.each(['isDraft', 'isPrerelease'] as const)('rejects %s without downloading', (field) => {
        release[field] = true;
        expect(() => {
            prepare(envFor(target));
        }).toThrow('published stable');
        expect(execFileSync).toHaveBeenCalledTimes(1);
    });
    it('stops before assets if store credentials are absent', () => {
        const name = Object.keys(STORE_CONFIG[target] ?? {})[0] ?? '';
        expect(() => {
            prepare({ ...envFor(target), [name]: '' });
        }).toThrow(name);
        expect(execFileSync).toHaveBeenCalledTimes(1);
    });
    it('rejects a commit outside master before downloading assets', () => {
        vi.mocked(execFileSync).mockImplementation((file, args) => {
            if (file === 'gh') {
                return JSON.stringify(release);
            }
            if (args?.[0] === 'merge-base') {
                throw new Error('not an ancestor');
            }
            return 'fixture-commit';
        });
        expect(() => {
            prepare(envFor(target));
        }).toThrow('not an ancestor');
        expect(downloadArguments()).toBeUndefined();
        expect(appendFileSync).not.toHaveBeenCalled();
    });
    it('rejects a tagged package.json version that differs from the release', () => {
        vi.mocked(execFileSync).mockImplementation((file, args) => {
            if (file === 'gh') {
                return JSON.stringify(release);
            }
            return args?.[0] === 'show' ? '{"version":"9.9.9"}' : 'fixture-commit';
        });
        expect(() => {
            prepare(envFor(target));
        }).toThrow('package.json');
        expect(appendFileSync).not.toHaveBeenCalled();
    });
    it('refuses corrupt checksums before writing successful release outputs', () => {
        vi.mocked(readFileSync).mockReturnValue('invalid checksum');
        expect(() => {
            prepare(envFor(target));
        }).toThrow('SHA-256');
        expect(appendFileSync).not.toHaveBeenCalled();
    });
    it('refuses a package built for another store even when its checksum matches', () => {
        const store: string = target;
        assets[assetName(target)] = store === Store.Firefox ? chromiumPackage : firefoxPackage;
        const reason = store === Store.Firefox ? 'Gecko' : 'service worker';
        expect(() => {
            prepare(envFor(target));
        }).toThrow(reason);
        expect(appendFileSync).not.toHaveBeenCalled();
    });
    it('verifies the release in validate mode without a store-specific step', () => {
        prepare(envFor(target, 'validate'));
        expect(downloadArguments()).toContain(assetName(target));
        expect(appendFileSync).toHaveBeenCalledTimes(1);
    });
});

describe('Firefox approval notes', () => {
    const NOTES_TARGET = path.join(STORE_UPLOAD_DIRECTORY, AMO_APPROVAL_NOTES_FILENAME);
    const writtenNotes = (): string | undefined => vi.mocked(writeFileSync).mock.calls
        .find(([file]) => String(file) === NOTES_TARGET)?.[1] as string | undefined;

    it('send a short note that links the reviewer instructions pinned to the release tag', () => {
        prepare(envFor(Store.Firefox, DeployMode.Submit));
        const notes = writtenNotes() ?? '';
        expect(notes).toContain(`https://github.com/fixture/repository/blob/v1.2.3/${AMO_REVIEW_NOTES_PATH}`);
        expect(notes).toContain('no remote code');
        expect(notes).not.toContain(REVIEW_INSTRUCTIONS);
        expect(amoNotesLength(notes)).toBeLessThanOrEqual(AMO_APPROVAL_NOTES_OWN_LIMIT);
    });
    it('stay empty for a release source without reviewer instructions', () => {
        assets[assetName('source')] = pack(sourceFiles);
        prepare(envFor(Store.Firefox, DeployMode.Submit));
        expect(writtenNotes()).toBe('');
    });
    it.each([DeployMode.Validate, DeployMode.Submit])(
        'fail %s mode before writing notes that exceed the limit',
        (mode) => {
            notesLimit.override = 10;
            expect(() => {
                prepare(envFor(Store.Firefox, mode));
            }).toThrow('the limit is 10');
            expect(writeFileSync).not.toHaveBeenCalled();
            expect(appendFileSync).not.toHaveBeenCalled();
        },
    );
    it('do not block status mode, which never sends them', () => {
        notesLimit.override = 10;
        prepare(envFor(Store.Firefox, DeployMode.Status));
        expect(appendFileSync).toHaveBeenCalledTimes(1);
    });
});

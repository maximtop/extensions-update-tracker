import fs from 'fs';
import os from 'os';
import path from 'path';

import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
} from 'vitest';

import { createZip } from '../../scripts/build/create-zip';

describe('createZip', () => {
    let workDir: string;
    let sourceDir: string;
    let zipPath: string;

    beforeEach(() => {
        workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-zip-'));
        sourceDir = path.join(workDir, 'chrome');
        zipPath = path.join(workDir, 'chrome.zip');

        fs.mkdirSync(path.join(sourceDir, '_locales', 'en'), { recursive: true });
        fs.writeFileSync(path.join(sourceDir, 'manifest.json'), '{"manifest_version":3}');
        fs.writeFileSync(path.join(sourceDir, '_locales', 'en', 'messages.json'), '{}');
    });

    afterEach(() => {
        fs.rmSync(workDir, { recursive: true, force: true });
    });

    it('writes a zip archive at the requested path', async () => {
        await createZip(sourceDir, zipPath);

        expect(fs.existsSync(zipPath)).toBe(true);
        // "PK" is the local file header signature every zip archive starts with
        expect(fs.readFileSync(zipPath).subarray(0, 2).toString('latin1')).toBe('PK');
    });

    it('stores entries at the archive root, preserving nested paths', async () => {
        await createZip(sourceDir, zipPath);

        // Entry names are stored uncompressed in the zip headers, so they can be
        // matched directly without a zip reader dependency.
        const archive = fs.readFileSync(zipPath).toString('latin1');

        expect(archive).toContain('manifest.json');
        expect(archive).toContain('_locales/en/messages.json');
        // The source directory itself must not become part of any entry name
        expect(archive).not.toContain('chrome/manifest.json');
    });

    it('does not fail on an empty directory', async () => {
        const emptyDir = path.join(workDir, 'empty');
        fs.mkdirSync(emptyDir);

        await createZip(emptyDir, zipPath);

        expect(fs.existsSync(zipPath)).toBe(true);
    });
});

import fs from 'fs';
import path from 'path';

import { ZipFile } from 'yazl';

/**
 * Collects every file under `dir` as a path relative to `base`.
 *
 * The result is sorted so that the archive layout does not depend on the order
 * the filesystem happens to enumerate entries in.
 */
const collectFiles = (dir: string, base: string): string[] => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...collectFiles(entryPath, base));
        } else {
            files.push(path.relative(base, entryPath));
        }
    }

    return files.sort();
};

/**
 * Packs the contents of `sourceDir` into `zipPath`.
 *
 * Files land at the archive root rather than inside a wrapper directory, which
 * is the layout the Chrome Web Store expects from an extension package.
 */
export const createZip = async (sourceDir: string, zipPath: string): Promise<void> => {
    const zipFile = new ZipFile();

    for (const relativePath of collectFiles(sourceDir, sourceDir)) {
        zipFile.addFile(
            path.join(sourceDir, relativePath),
            // Zip entry names are always forward-slash separated, regardless of
            // the host platform's path separator.
            relativePath.split(path.sep).join('/'),
        );
    }

    zipFile.end();

    await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        output.on('close', resolve);
        output.on('error', reject);
        zipFile.outputStream.on('error', reject);
        zipFile.outputStream.pipe(output);
    });
};

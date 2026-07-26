/**
 * Minimal static file server for the generator.
 *
 * The built pages are served over http rather than opened as `file://` URLs so
 * they run in a normal secure-ish origin: `file://` gives every document an
 * opaque origin, which trips up storage and module loading in ways that have
 * nothing to do with what the screenshots are supposed to show.
 */

import fs from 'fs/promises';
import http from 'http';
import path from 'path';

const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
};

export interface StaticServer {
    origin: string;
    close: () => Promise<void>;
}

/**
 * Serves `root` on an ephemeral port.
 *
 * @param root Absolute path of the directory to serve
 * @returns The server's origin and a shutdown handle
 */
export async function startStaticServer(root: string): Promise<StaticServer> {
    const server = http.createServer((request, response) => {
        const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
        const filePath = path.join(root, path.normalize(requestPath));

        // Reject anything that escapes the served directory
        if (!filePath.startsWith(root)) {
            response.writeHead(403).end();
            return;
        }

        fs.readFile(filePath)
            .then((content) => {
                const contentType = CONTENT_TYPES[path.extname(filePath)] ?? 'application/octet-stream';
                response.writeHead(200, { 'Content-Type': contentType }).end(content);
            })
            .catch(() => {
                response.writeHead(404).end();
            });
    });

    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    if (address === null || typeof address === 'string') {
        throw new Error('Static server did not report a numeric port');
    }

    return {
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        }),
    };
}

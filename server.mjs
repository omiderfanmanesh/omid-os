import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT = path.resolve(process.env.PUBLIC_DIR || ROOT);
const PORT = Number(process.env.PORT || 8888);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY_SIZE = 8192;
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.pdf': 'application/pdf',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
}

const chatHandler = (await import('./netlify/functions/chat.mjs')).default;

function securityHeaders() {
    return {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=(), microphone=(), geolocation=()',
        'content-security-policy': "default-src 'self'; script-src 'self' 'sha256-kt0jymrMRf4H3F6ZwmAuG2xlzujDGA3Mcl+ql8Mp+uM='; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    };
}

function sendJson(res, status, error, headers = {}) {
    res.writeHead(status, {
        ...securityHeaders(),
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...headers
    });
    res.end(JSON.stringify({ error }));
}

async function readBoundedBody(req) {
    const declaredLength = Number(req.headers['content-length'] || 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_SIZE) {
        const error = new Error('Payload too large');
        error.status = 413;
        throw error;
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_SIZE) {
            const error = new Error('Payload too large');
            error.status = 413;
            throw error;
        }
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function proxyChat(req, res, url) {
    const body = req.method === 'POST' ? await readBoundedBody(req) : undefined;
    const clientAbort = new AbortController();
    const abort = () => clientAbort.abort();
    req.once('aborted', abort);
    res.once('close', () => {
        if (!res.writableEnded) abort();
    });

    const headers = new Headers();
    if (req.headers['content-type']) headers.set('content-type', req.headers['content-type']);
    if (req.headers['content-length']) headers.set('content-length', req.headers['content-length']);

    const request = new Request(`http://localhost${url.pathname}`, {
        method: req.method,
        headers,
        body,
        signal: clientAbort.signal
    });
    const response = await chatHandler(request, { ip: req.socket.remoteAddress || '127.0.0.1' });
    const responseHeaders = { ...securityHeaders() };
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });
    res.writeHead(response.status, responseHeaders);

    if (!response.body) {
        res.end();
        return;
    }

    const reader = response.body.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!res.write(value)) await once(res, 'drain');
        }
        res.end();
    } finally {
        reader.releaseLock();
    }
}

function resolvePublicFile(pathname) {
    if (pathname === '/') return path.join(PUBLIC_ROOT, 'index.html');
    if (pathname === '/robots.txt') return path.join(PUBLIC_ROOT, 'robots.txt');
    if (pathname === '/sitemap.xml') return path.join(PUBLIC_ROOT, 'sitemap.xml');
    if (!pathname.startsWith('/assets/')) return null;

    const assetsRoot = path.join(PUBLIC_ROOT, 'assets');
    const filePath = path.resolve(PUBLIC_ROOT, `.${decodeURIComponent(pathname)}`);
    if (filePath !== assetsRoot && !filePath.startsWith(`${assetsRoot}${path.sep}`)) return null;
    return filePath;
}

async function serveStatic(req, res, pathname) {
    let filePath;
    try {
        filePath = resolvePublicFile(pathname);
    } catch {
        filePath = null;
    }
    if (!filePath) {
        res.writeHead(404, { ...securityHeaders(), 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    try {
        const stat = await fs.promises.stat(filePath);
        if (!stat.isFile()) throw new Error('Not a file');
    } catch {
        res.writeHead(404, { ...securityHeaders(), 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const cacheControl = ext === '.html' || ext === '.pdf'
        ? 'no-cache'
        : 'public, max-age=3600, must-revalidate';
    res.writeHead(200, {
        ...securityHeaders(),
        'content-type': MIME[ext] || 'application/octet-stream',
        'content-length': (await fs.promises.stat(filePath)).size,
        'cache-control': cacheControl
    });
    if (req.method === 'HEAD') {
        res.end();
        return;
    }
    fs.createReadStream(filePath)
        .on('error', () => res.destroy())
        .pipe(res);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');

    if (url.pathname === '/healthz') {
        res.writeHead(200, { ...securityHeaders(), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ ok: true, aiConfigured: Boolean(process.env.OLLAMA_API_KEY) }));
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        if (url.pathname !== '/api/chat') {
            sendJson(res, 404, 'Not found');
            return;
        }
        try {
            await proxyChat(req, res, url);
        } catch (error) {
            console.error('[server] API error:', error.message);
            if (!res.headersSent) sendJson(res, error.status || 500, error.status === 413 ? 'Payload too large' : 'Internal server error');
            else res.destroy();
        }
        return;
    }

    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
        res.writeHead(405, { ...securityHeaders(), Allow: 'GET, HEAD' });
        res.end();
        return;
    }

    await serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
    console.log(`OMID/OS dev server running at http://${HOST}:${PORT}`);
});

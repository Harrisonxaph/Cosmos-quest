// Minimal static file server for browser tests (no extra dependencies).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function startStaticServer(root, port = 0) {
  const base = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = normalize(join(base, path.endsWith('/') ? `${path}index.html` : path));
      if (!file.startsWith(base)) throw Object.assign(new Error('Forbidden'), { status: 403 });
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      response.writeHead(error.status ?? 404);
      response.end('Not found');
    }
  });
  return new Promise(resolvePromise => {
    server.listen(port, '127.0.0.1', () => {
      resolvePromise({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(done => server.close(done)) });
    });
  });
}

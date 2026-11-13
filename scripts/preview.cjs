// Serve the Expo static export, including clean URLs such as /admin/orders.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..', process.env.PREVIEW_DIR || 'dist');
const port = Number(process.env.PORT || 8081);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
http
  .createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const base = path.resolve(root, '.' + requested);
      if (base !== root && !base.startsWith(root + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      let file;
      for (const candidate of [base, base + '.html', path.join(base, 'index.html')]) {
        try {
          if ((await fs.stat(candidate)).isFile()) {
            file = candidate;
            break;
          }
        } catch {}
      }
      if (!file) {
        res.writeHead(404);
        res.end('Page not found. Run npm run build:web before previewing.');
        return;
      }
      const body = await fs.readFile(file);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
        'Content-Length': body.length,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(400);
      res.end('Invalid request');
    }
  })
  .listen(port, '0.0.0.0', () =>
    console.log(`Campusbite production preview: http://localhost:${port}`),
  );

/* Tiny dev server for previewing the site locally.
   Run:  node serve.js     then open http://localhost:8790

   Double-clicking index.html also works now - the site uses ordinary
   scripts, not ES modules. Use this server when you want Instagram embeds
   to render, since their script does not always run over file://. */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 8790;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.json': 'application/json',
  '.mp4': 'video/mp4',
};

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/') url = '/index.html';

  const file = path.join(ROOT, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404 — ' + url); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('EDGE running on http://localhost:' + PORT));

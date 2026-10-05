import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const home = await readFile('dist/index.html', 'utf8');
const app = await readFile('dist/app.html', 'utf8');
const nginx = await readFile('../nginx.conf', 'utf8');
assert.equal((home.match(/<h1\b/g) || []).length, 1);
assert.match(home, /Menos planilha/);
assert.match(home, /href="\/register"/);
assert.match(home, /href="\/privacy"/);
assert.match(home, /rel="canonical" href="https:\/\/myteacherapp.com.br\/"/);
assert.match(home, /content="index, follow"/);
assert.match(app, /content="noindex, follow"/);
assert.doesNotMatch(app, /rel="canonical"|Menos planilha/);
assert.match(nginx, /script-src 'self';/);
assert.match(nginx, /frame-ancestors 'none'/);
assert.match(nginx, /X-Content-Type-Options "nosniff" always/);
// Child add_header directives would silently remove inherited protections.
assert.doesNotMatch(nginx.slice(nginx.indexOf('location = /')), /add_header/);
assert.match(await readFile('dist/robots.txt', 'utf8'), /Sitemap: https:\/\/myteacherapp.com.br\/sitemap.xml/);
assert.match(await readFile('dist/sitemap.xml', 'utf8'), /<loc>https:\/\/myteacherapp.com.br\/<\/loc>/);
console.log('SEO HTML, route isolation, sitemap and security configuration checks passed.');

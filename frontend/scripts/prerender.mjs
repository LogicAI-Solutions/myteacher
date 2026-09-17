import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Render the same public component for visitors and crawlers, without API calls.
const server = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
});
try {
    const template = await readFile('dist/index.html', 'utf8');
    assert.ok(template.includes('<div id="root"></div>'), 'Run npm run build to regenerate the HTML template before prerendering.');
    // Private routes must never receive the homepage content or its canonical URL.
    const app = template
        .replace('content="index, follow"', 'content="noindex, follow"')
        .replace(/\s*<link rel="canonical"[^>]*>/, '')
        .replace(/\s*<meta property="og:[^"]*"[^>]*>/g, '')
        .replace(/<title>.*?<\/title>/, '<title>Minha conta | MyTeacherApp</title>');
    await writeFile('dist/app.html', app);
    const { render } = await server.ssrLoadModule('/src/prerender.tsx');
    await writeFile('dist/index.html', template.replace('<div id="root"></div>', () => `<div id="root">${render()}</div>`));
} finally {
    await server.close();
}

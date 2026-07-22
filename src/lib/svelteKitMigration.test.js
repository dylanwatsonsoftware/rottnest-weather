import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('the application is served through a SvelteKit SSR page', () => {
    assert.equal(existsSync(new URL('src/routes/+page.svelte', root)), true);
    assert.equal(existsSync(new URL('src/routes/+page.server.js', root)), true);

    const config = readFileSync(new URL('svelte.config.js', root), 'utf8');
    assert.match(config, /adapter-vercel/);
    assert.match(config, /adapter:\s*adapter\(\)/);
});

test('Leaflet and Chart.js are loaded only from browser lifecycle code', () => {
    const map = readFileSync(new URL('Map.svelte', import.meta.url), 'utf8');
    const controls = readFileSync(new URL('Controls.svelte', import.meta.url), 'utf8');

    assert.doesNotMatch(map, /import L from ['"]leaflet['"]/);
    assert.match(map, /await import\(['"]leaflet['"]\)/);
    assert.doesNotMatch(controls, /import \{ Chart, registerables \} from ['"]chart\.js['"]/);
    assert.match(controls, /await Promise\.all\([\s\S]*import\(['"]chart\.js['"]\)/);
});

test('SvelteKit page metadata is rendered declaratively', () => {
    const app = readFileSync(new URL('src/App.svelte', root), 'utf8');
    assert.match(app, /<svelte:head>/);
    assert.match(app, /property="og:title"/);
    assert.match(app, /name="twitter:card"/);
});

test('SSR selects location photography for social metadata', () => {
    const server = readFileSync(new URL('src/routes/+page.server.js', root), 'utf8');
    assert.match(server, /getLocationImage\(selectedLocation\)/);
    assert.match(server, /imageUrl/);
});

test('SvelteKit exposes a dynamic social image endpoint', () => {
    assert.equal(existsSync(new URL('src/routes/social-image/+server.js', root)), true);
});

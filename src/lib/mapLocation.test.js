import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mapSource = readFileSync(new URL('./Map.svelte', import.meta.url), 'utf8');

test('map watches location without moving the map view', () => {
    assert.match(mapSource, /map\.locate\(\{\s*setView:\s*false,\s*watch:\s*true\s*\}\)/);
});

test('map only exposes user location markers inside Rottnest bounds', () => {
    assert.match(mapSource, /import \{ isWithinRottnestBounds \} from '\.\/recommendations\.js';/);
    assert.match(mapSource, /if \(!isWithinRottnestBounds\(location\)\)\s*\{/);
    assert.match(mapSource, /clearUserLocation\(\);/);
    assert.match(mapSource, /onUserLocationChange\(null\);/);
    assert.match(mapSource, /onUserLocationChange\(location\);/);
});

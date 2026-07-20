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

test('map highlights selected nearby places with a visible label', () => {
    assert.match(mapSource, /const selectedPlaceName = \$derived/);
    assert.match(mapSource, /mapNavigationRequest\?\.type === 'landmark'/);
    assert.match(mapSource, /mapNavigationRequest\?\.type === 'facility'/);
    assert.match(mapSource, /mapNavigationRequest\?\.type === 'business'/);
    assert.match(mapSource, /shouldShowPlaceLabel\(place,\s*currentZoom,\s*selectedPlaceName\)/);
    assert.match(mapSource, /className: `landmark-icon \$\{place\.type\} \$\{place\.category \|\| place\.subtype \|\| ''\} \$\{selected\}`/);
    assert.match(mapSource, /if \(selected\) marker\.setZIndexOffset\(1000\)/);
});

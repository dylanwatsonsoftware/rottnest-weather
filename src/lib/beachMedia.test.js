import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import beaches from '../../public/beaches.json' with { type: 'json' };
import { BEACH_MEDIA, getBeachImages } from './beachMedia.js';

const BEACH_NAMES = new Set(beaches.map((beach) => beach.name));

test('beach media is keyed to known beaches and local image files', () => {
    for (const [beachName, images] of Object.entries(BEACH_MEDIA)) {
        assert.ok(BEACH_NAMES.has(beachName), `${beachName} should exist in beach data`);
        assert.ok(images.length > 0, `${beachName} should have at least one image`);

        for (const image of images) {
            assert.match(image.src, /^\/beach-images\/.+\.(jpg|jpeg|png|webp)$/i);
            assert.ok(existsSync(new URL(`../../public${image.src}`, import.meta.url)), `${image.src} should exist`);
            assert.ok(image.alt.length > 20, `${image.src} should have useful alt text`);
            assert.ok(image.author, `${image.src} should include author attribution`);
            assert.ok(image.license, `${image.src} should include a license`);
            assert.match(image.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\//);
            assert.match(image.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
        }
    }
});

test('beach image lookup returns exact media without exposing mutable catalog data', () => {
    const images = getBeachImages('The Basin');

    assert.ok(images.length > 0);
    assert.notEqual(images, BEACH_MEDIA['The Basin']);
    assert.deepEqual(getBeachImages('Unknown Beach'), []);
});

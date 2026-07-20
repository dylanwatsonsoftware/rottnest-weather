import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { PLACE_MEDIA, getPlaceImages } from './placeMedia.js';

const facilities = JSON.parse(readFileSync(new URL('../../public/facilities.json', import.meta.url), 'utf8'));
const landmarks = JSON.parse(readFileSync(new URL('../../public/landmarks.json', import.meta.url), 'utf8'));
const LANDMARK_NAMES = new Set(landmarks.map((place) => place.name));
const FOOD_NAMES = new Set(
    facilities
        .filter((place) => place.category === 'cafe' || place.category === 'restaurant')
        .map((place) => place.name)
);
const REQUIRED_PLACE_NAMES = new Set([...LANDMARK_NAMES, ...FOOD_NAMES]);

test('place media covers every known landmark and food venue with local image files', () => {
    for (const placeName of REQUIRED_PLACE_NAMES) {
        assert.ok(PLACE_MEDIA[placeName]?.length, `${placeName} should have place media`);
    }

    for (const [placeName, images] of Object.entries(PLACE_MEDIA)) {
        assert.ok(REQUIRED_PLACE_NAMES.has(placeName), `${placeName} should exist as a landmark or food venue`);

        for (const image of images) {
            assert.match(image.src, /^\/(place-images|beach-images)\/.+\.(jpg|jpeg|png|webp)$/i);
            assert.ok(existsSync(new URL(`../../public${image.src}`, import.meta.url)), `${image.src} should exist`);
            assert.ok(image.alt.length > 20, `${image.src} should have useful alt text`);
            assert.ok(image.author, `${image.src} should include author attribution`);
            assert.ok(image.license, `${image.src} should include a license`);
            assert.match(image.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\//);
            assert.match(image.sourceUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
        }
    }
});

test('place image lookup returns media without exposing mutable catalog data', () => {
    const images = getPlaceImages('Wadjemup Lighthouse');

    assert.ok(images.length > 0);
    assert.notEqual(images, PLACE_MEDIA['Wadjemup Lighthouse']);
    assert.deepEqual(getPlaceImages('Unknown Place'), []);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { buildPlaceSearchIndex, searchPlaces } from './placeSearch.js';

const beaches = [
    { name: 'Little Salmon Bay', aliases: ['LSB'], lat: -32.024, lon: 115.525 },
    { name: 'Pinky Beach', lat: -31.988, lon: 115.536 }
];

const landmarks = [
    { name: 'Wadjemup Lighthouse', type: 'landmark', subtype: 'lighthouse', lat: -32.005, lon: 115.515 },
    { name: 'Parker Point Stop', type: 'business', subtype: 'transport', lat: -32.023, lon: 115.528 }
];

const facilities = [
    { name: 'The Lane Cafe', type: 'facility', category: 'cafe', lat: -31.995, lon: 115.54, rating: 4.5, userRatingCount: 120 },
    { name: 'Broken Place', type: 'facility', category: 'toilets' }
];

test('buildPlaceSearchIndex normalizes beaches landmarks and facilities into searchable results', () => {
    const index = buildPlaceSearchIndex({ beaches, landmarks, facilities });

    assert.deepEqual(index.map((item) => item.name), [
        'Little Salmon Bay',
        'Pinky Beach',
        'Wadjemup Lighthouse',
        'Parker Point Stop',
        'The Lane Cafe'
    ]);
    assert.equal(index[0].kind, 'beach');
    assert.equal(index[0].label, 'Beach');
    assert.deepEqual(index[0].aliases, ['LSB']);
    assert.equal(index[2].kind, 'landmark');
    assert.equal(index[2].label, 'Lighthouse');
    assert.equal(index[4].kind, 'facility');
    assert.equal(index[4].label, 'Cafe');
});

test('searchPlaces ranks case-insensitive prefix matches before substring and alias matches', () => {
    const index = buildPlaceSearchIndex({ beaches, landmarks, facilities });

    assert.deepEqual(
        searchPlaces(index, 'p').map((item) => item.name),
        ['Parker Point Stop', 'Pinky Beach', 'Wadjemup Lighthouse']
    );
    assert.deepEqual(
        searchPlaces(index, 'LIGHT').map((item) => item.name),
        ['Wadjemup Lighthouse']
    );
    assert.deepEqual(
        searchPlaces(index, 'salmon').map((item) => item.name),
        ['Little Salmon Bay']
    );
    assert.deepEqual(
        searchPlaces(index, 'lsb').map((item) => item.name),
        ['Little Salmon Bay']
    );
});

test('searchPlaces returns no results for empty or unknown queries', () => {
    const index = buildPlaceSearchIndex({ beaches, landmarks, facilities });

    assert.deepEqual(searchPlaces(index, ''), []);
    assert.deepEqual(searchPlaces(index, '   '), []);
    assert.deepEqual(searchPlaces(index, 'not here'), []);
});

test('searchPlaces respects the result limit', () => {
    const index = buildPlaceSearchIndex({
        beaches: [
            { name: 'Parker Point', lat: -32.023, lon: 115.528 },
            { name: 'Pinky Beach', lat: -31.988, lon: 115.536 }
        ],
        landmarks,
        facilities
    });

    assert.deepEqual(
        searchPlaces(index, 'p', 2).map((item) => item.name),
        ['Parker Point', 'Parker Point Stop']
    );
});

test('searchPlaces can include distance labels from the user location', () => {
    const index = buildPlaceSearchIndex({ beaches, landmarks, facilities });
    const results = searchPlaces(index, 'lane', 8, { lat: -31.995, lon: 115.539 });

    assert.equal(results[0].name, 'The Lane Cafe');
    assert.equal(results[0].distanceLabel, '94 m');
    assert.equal(results[0].distanceKm, 0.1);
});

test('searchPlaces includes rating labels when bundled place ratings are available', () => {
    const index = buildPlaceSearchIndex({ beaches, landmarks, facilities });
    const results = searchPlaces(index, 'lane', 8, { lat: -31.995, lon: 115.539 });

    assert.equal(results[0].name, 'The Lane Cafe');
    assert.equal(results[0].ratingLabel, '4.5 ★ (120)');
});

test('bundled place search has no stale duplicate facility landmarks', () => {
    const bundledBeaches = JSON.parse(readFileSync(new URL('../../public/beaches.json', import.meta.url), 'utf8'));
    const bundledLandmarks = JSON.parse(readFileSync(new URL('../../public/landmarks.json', import.meta.url), 'utf8'));
    const bundledFacilities = JSON.parse(readFileSync(new URL('../../public/facilities.json', import.meta.url), 'utf8'));
    const index = buildPlaceSearchIndex({
        beaches: bundledBeaches,
        landmarks: bundledLandmarks,
        facilities: bundledFacilities
    });

    ['Geordie Bay Facilities', 'The Basin Facilities', 'Parker Point Bus Stop'].forEach((name) => {
        assert.equal(index.filter((place) => place.name === name).length, 1, `${name} should appear once`);
    });
    assert.equal(index.some((place) => place.name === 'Parker Point Stop'), false);
});

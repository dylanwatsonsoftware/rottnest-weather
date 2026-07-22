import assert from 'node:assert/strict';
import test from 'node:test';
import { getPlanningSocialImage } from './socialMedia.js';

const beaches = [
    { name: 'Far Beach', lat: -32.04, lon: 115.45 },
    { name: 'Little Salmon Bay', lat: -32.0242, lon: 115.5251 }
];

test('shared pins use the nearest location image', () => {
    assert.equal(getPlanningSocialImage({
        pin: { lat: -32.0239, lon: 115.525 },
        beaches,
        getImageUrl: (location) => location.name === 'Little Salmon Bay' ? '/beach-images/little-salmon-bay-01.jpg' : '/far.jpg'
    }), '/beach-images/little-salmon-bay-01.jpg');
});

test('shared routes use the location nearest their midpoint', () => {
    assert.equal(getPlanningSocialImage({
        routePoints: [
            { lat: -32.022, lon: 115.523 },
            { lat: -32.026, lon: 115.527 }
        ],
        beaches,
        getImageUrl: (location) => location.name === 'Little Salmon Bay' ? '/beach-images/little-salmon-bay-01.jpg' : '/far.jpg'
    }), '/beach-images/little-salmon-bay-01.jpg');
});

test('planning cards skip closer locations that do not have an image', () => {
    assert.equal(getPlanningSocialImage({
        pin: { lat: -32.0242, lon: 115.5251 },
        beaches,
        getImageUrl: (location) => location.name === 'Far Beach' ? '/far.jpg' : ''
    }), '/far.jpg');
});

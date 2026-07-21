import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildShareUrl,
    findNearestSharedHourIndex,
    getLocationKey,
    getSharedLocationFromUrl,
    parseSharedLocationKey
} from './urlState.js';

test('getLocationKey creates readable stable keys for beaches and places', () => {
    assert.equal(getLocationKey({ type: 'beach', name: 'Little Salmon Bay' }), 'beach:little-salmon-bay');
    assert.equal(getLocationKey({ type: 'facility', id: 'rottnest-bakery', name: 'Rottnest Bakery' }), 'facility:rottnest-bakery');
    assert.equal(getLocationKey({ type: 'landmark', name: 'Bathurst Lighthouse' }), 'landmark:bathurst-lighthouse');
});

test('buildShareUrl encodes selected location and forecast time in the address', () => {
    const url = buildShareUrl('https://example.test/?old=value', {
        locationKey: 'beach:little-salmon-bay',
        time: '2026-07-21T08:00'
    });

    assert.equal(url, 'https://example.test/?location=beach%3Alittle-salmon-bay&time=2026-07-21T08%3A00');
});

test('buildShareUrl can encode a selected forecast time without a location', () => {
    const url = buildShareUrl('https://example.test/?location=beach%3Aold&time=2026-07-21T08%3A00', {
        time: '2026-07-30T06:00'
    });

    assert.equal(url, 'https://example.test/?time=2026-07-30T06%3A00');
});

test('getSharedLocationFromUrl reads location and selected time from the address', () => {
    assert.deepEqual(getSharedLocationFromUrl('https://example.test/?location=facility%3Arottnest-bakery&time=2026-07-21T09%3A00'), {
        locationKey: 'facility:rottnest-bakery',
        time: '2026-07-21T09:00'
    });
});

test('parseSharedLocationKey separates kind and slug', () => {
    assert.deepEqual(parseSharedLocationKey('landmark:bathurst-lighthouse'), {
        kind: 'landmark',
        slug: 'bathurst-lighthouse'
    });
    assert.equal(parseSharedLocationKey('bad-value'), null);
});

test('findNearestSharedHourIndex resolves shared timestamps to the nearest forecast hour', () => {
    const forecastData = {
        time: [
            '2026-07-21T06:00',
            '2026-07-21T07:00',
            '2026-07-21T08:00'
        ]
    };

    assert.equal(findNearestSharedHourIndex(forecastData, '2026-07-21T07:20'), 1);
    assert.equal(findNearestSharedHourIndex(forecastData, 'nope'), null);
});

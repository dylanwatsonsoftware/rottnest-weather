import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildShareUrl,
    findNearestSharedHourIndex,
    getLocationKey,
    getSharedLocationFromUrl,
    parseSharedPin,
    parseSharedRoute,
    isSharedTimeCoveredByForecast,
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
        time: '2026-07-21T08:00',
        panelMode: 'open'
    });

    assert.equal(url, 'https://example.test/?location=beach%3Alittle-salmon-bay&time=2026-07-21T08%3A00&panel=open');
});

test('buildShareUrl can encode a selected forecast time without a location', () => {
    const url = buildShareUrl('https://example.test/?location=beach%3Aold&time=2026-07-21T08%3A00', {
        time: '2026-07-30T06:00',
        panelMode: 'semi'
    });

    assert.equal(url, 'https://example.test/?time=2026-07-30T06%3A00&panel=semi');
});

test('buildShareUrl preserves a selected location route and pin together', () => {
    const url = buildShareUrl('https://example.test/?old=value', {
        locationKey: 'beach:little-salmon-bay',
        time: '2026-07-21T08:00',
        pin: { lat: -32.0064123, lon: 115.5099876 },
        route: [
            { lat: -32.0064, lon: 115.5099 },
            { lat: -32.0101, lon: 115.5152 },
            { lat: -32.0133, lon: 115.5194 }
        ]
    });

    assert.equal(url, 'https://example.test/?location=beach%3Alittle-salmon-bay&time=2026-07-21T08%3A00&pin=-32.00641%2C115.50999&route=-32.00640%2C115.50990%3B-32.01010%2C115.51520%3B-32.01330%2C115.51940');
});

test('buildShareUrl can encode a route name with shared waypoints', () => {
    const url = buildShareUrl('https://example.test/?old=value', {
        routeName: 'West End snorkel ride',
        route: [
            { lat: -32.0064, lon: 115.5099 },
            { lat: -32.0101, lon: 115.5152 }
        ]
    });

    assert.equal(url, 'https://example.test/?route=-32.00640%2C115.50990%3B-32.01010%2C115.51520&routeName=West+End+snorkel+ride');
});

test('getSharedLocationFromUrl reads location and selected time from the address', () => {
    assert.deepEqual(getSharedLocationFromUrl('https://example.test/?location=facility%3Arottnest-bakery&time=2026-07-21T09%3A00&panel=closed'), {
        locationKey: 'facility:rottnest-bakery',
        time: '2026-07-21T09:00',
        panelMode: 'closed',
        pin: null,
        route: [],
        routeName: ''
    });
});

test('getSharedLocationFromUrl reads shared pins route waypoints and route name', () => {
    assert.deepEqual(getSharedLocationFromUrl('https://example.test/?pin=-32.00641%2C115.50999&route=-32.00640%2C115.50990%3B-32.01010%2C115.51520&routeName=West+End+snorkel+ride'), {
        locationKey: '',
        time: '',
        panelMode: '',
        pin: { lat: -32.00641, lon: 115.50999 },
        route: [
            { lat: -32.0064, lon: 115.5099 },
            { lat: -32.0101, lon: 115.5152 }
        ],
        routeName: 'West End snorkel ride'
    });
});

test('parseSharedPin and parseSharedRoute ignore malformed coordinates', () => {
    assert.equal(parseSharedPin('nope'), null);
    assert.equal(parseSharedPin('-91,115'), null);
    assert.deepEqual(parseSharedRoute('-32,115;bad;-33,116'), [
        { lat: -32, lon: 115 },
        { lat: -33, lon: 116 }
    ]);
    assert.deepEqual(parseSharedRoute('-32,115'), []);
});

test('panel mode URL state only accepts known panel states', () => {
    assert.deepEqual(getSharedLocationFromUrl('https://example.test/?panel=max'), {
        locationKey: '',
        time: '',
        panelMode: '',
        pin: null,
        route: [],
        routeName: ''
    });

    assert.equal(buildShareUrl('https://example.test/', {
        time: '2026-07-21T09:00',
        panelMode: 'max'
    }), 'https://example.test/?time=2026-07-21T09%3A00');
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

test('shared forecast times must be covered before they are resolved', () => {
    const cachedForecast = {
        time: [
            '2026-07-21T06:00',
            '2026-07-21T07:00',
            '2026-07-21T08:00'
        ]
    };

    assert.equal(isSharedTimeCoveredByForecast(cachedForecast, '2026-07-21T07:20'), true);
    assert.equal(isSharedTimeCoveredByForecast(cachedForecast, '2026-07-30T10:00'), false);
    assert.equal(findNearestSharedHourIndex(cachedForecast, '2026-07-30T10:00'), null);
});

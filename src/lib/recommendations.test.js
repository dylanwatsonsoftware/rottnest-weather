import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildBestBeachTimeline,
    buildBeachStatusTimeline,
    buildRecommendations,
    filterRecommendations,
    getDirection,
    getBeachDetailNotes,
    getInitialFocusRecommendations,
    getSafetyNotices,
    shouldUseUserLocationForFocus
} from './recommendations.js';

const beaches = [
    { name: 'Sheltered Bay', ok_winds: ['S', 'SW', 'W'], lat: -32, lon: 115.5 },
    { name: 'Open Reef', ok_winds: ['N'], lat: -32.1, lon: 115.55 },
    { name: 'Flexible Cove', ok_winds: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], lat: -32.2, lon: 115.6 }
];

const forecast = {
    time: [
        '2026-07-20T08:00',
        '2026-07-20T09:00',
        '2026-07-20T10:00',
        '2026-07-20T11:00'
    ],
    windspeed_10m: [12, 18, 32, 14],
    winddirection_10m: [225, 0, 225, 180],
    temperature_2m: [21, 22, 22, 23],
    swell_wave_height: [0.5, 0.7, 1.6, 0.8]
};

test('getDirection converts degrees into compass points', () => {
    assert.equal(getDirection(0), 'N');
    assert.equal(getDirection(44), 'NE');
    assert.equal(getDirection(225), 'SW');
    assert.equal(getDirection(359), 'N');
});

test('buildRecommendations ranks beaches with states and reasons for the selected hour', () => {
    const recommendations = buildRecommendations(beaches, forecast, 0);

    assert.equal(recommendations[0].beach.name, 'Flexible Cove');
    assert.equal(recommendations[0].state, 'best');
    assert.match(recommendations[0].summary, /Excellent/);
    assert.ok(recommendations[0].score > recommendations[1].score);

    const avoided = recommendations.find((item) => item.beach.name === 'Open Reef');
    assert.equal(avoided.state, 'avoid');
    assert.ok(avoided.reasons.some((reason) => reason.includes('Wind direction')));
});

test('buildRecommendations finds the next better forecast window', () => {
    const recommendations = buildRecommendations(beaches, forecast, 1);
    const sheltered = recommendations.find((item) => item.beach.name === 'Sheltered Bay');

    assert.equal(sheltered.state, 'avoid');
    assert.equal(sheltered.nextGood.time, '2026-07-20T11:00');
    assert.equal(sheltered.nextGood.state, 'good');
});

test('buildBeachStatusTimeline scores one beach across a selected time range', () => {
    const timeline = buildBeachStatusTimeline(beaches[0], forecast, { min: 0, max: 2 });

    assert.equal(timeline.length, 3);
    assert.deepEqual(timeline.map((item) => item.hourIndex), [0, 1, 2]);
    assert.deepEqual(timeline.map((item) => item.state), ['good', 'avoid', 'avoid']);
    assert.deepEqual(timeline.map((item) => item.label), ['08:00 AM', '09:00 AM', '10:00 AM']);
});

test('buildBeachStatusTimeline returns no items without beach or forecast times', () => {
    assert.deepEqual(buildBeachStatusTimeline(null, forecast, { min: 0, max: 2 }), []);
    assert.deepEqual(buildBeachStatusTimeline(beaches[0], null, { min: 0, max: 2 }), []);
});

test('buildBestBeachTimeline picks the highest scoring beach for each forecast hour', () => {
    const recommendations = buildRecommendations(beaches.slice(0, 2), forecast, 0);
    const timeline = buildBestBeachTimeline(recommendations, forecast, { min: 0, max: 1 });

    assert.equal(timeline.length, 2);
    assert.deepEqual(timeline.map((item) => item.hourIndex), [0, 1]);
    assert.deepEqual(timeline.map((item) => item.beach.name), ['Sheltered Bay', 'Open Reef']);
    assert.deepEqual(timeline.map((item) => item.state), ['good', 'good']);
});

test('buildBestBeachTimeline returns no items without recommendations or forecast times', () => {
    assert.deepEqual(buildBestBeachTimeline([], forecast, { min: 0, max: 1 }), []);
    assert.deepEqual(buildBestBeachTimeline(buildRecommendations(beaches, forecast, 0), null, { min: 0, max: 1 }), []);
});

test('getBeachDetailNotes turns local beach metadata into display notes', () => {
    const notes = getBeachDetailNotes({
        exposure_note: 'Protected north-facing bay',
        facilities: ['Toilets', 'Cafe nearby'],
        activity_tags: ['snorkel', 'family swim'],
        advisory: {
            status: 'watch',
            message: 'Seasonal access may change.'
        },
        guide_note: 'Best in southerly winds.',
        caution_notes: ['Watch reef edges in swell.']
    });

    assert.deepEqual(notes, [
        'Protected north-facing bay',
        'Facilities: Toilets, Cafe nearby',
        'Good for: snorkel, family swim',
        'Advisory: Seasonal access may change.',
        'Best in southerly winds.',
        'Watch reef edges in swell.'
    ]);
});

test('safety tags temper snorkeling scores and explain local risks', () => {
    const recommendations = buildRecommendations([
        { name: 'Quiet Snorkel', ok_winds: ['SW'], lat: -32, lon: 115.5 },
        {
            name: 'Surf Break',
            ok_winds: ['SW'],
            lat: -32,
            lon: 115.51,
            safety_tags: ['surf_break', 'wildlife_sensitive']
        }
    ], forecast, 0);

    const quiet = recommendations.find((item) => item.beach.name === 'Quiet Snorkel');
    const surfBreak = recommendations.find((item) => item.beach.name === 'Surf Break');

    assert.ok(surfBreak.score < quiet.score);
    assert.ok(surfBreak.reasons.some((reason) => reason.includes('surf break')));
    assert.ok(surfBreak.reasons.some((reason) => reason.includes('wildlife')));
});

test('filterRecommendations applies state filters and low-zoom simplification', () => {
    const recommendations = buildRecommendations(beaches, forecast, 0);

    const bestOnly = filterRecommendations(recommendations, {
        states: { best: true, good: false, watch: false, avoid: false },
        showBeaches: true,
        showAllWhenZoomedOut: true
    }, 13);
    assert.deepEqual(bestOnly.map((item) => item.state), ['best']);

    const simplified = filterRecommendations(recommendations, {
        states: { best: true, good: true, watch: true, avoid: true },
        showBeaches: true,
        showAllWhenZoomedOut: false
    }, 10);
    assert.equal(simplified.length, 2);
    assert.ok(simplified.every((item) => item.state !== 'avoid'));
});

test('filterRecommendations applies a score cutoff across enabled beach states', () => {
    const recommendations = [
        { beach: { name: 'Very poor' }, state: 'avoid', score: 12 },
        { beach: { name: 'Least bad' }, state: 'avoid', score: 39 },
        { beach: { name: 'Watchable' }, state: 'watch', score: 55 },
        { beach: { name: 'Good' }, state: 'good', score: 72 }
    ];

    const filtered = filterRecommendations(recommendations, {
        states: { best: true, good: true, watch: true, avoid: true },
        showBeaches: true,
        showAllWhenZoomedOut: true,
        minimumScore: 38
    }, 13);

    assert.deepEqual(filtered.map((item) => item.beach.name), ['Least bad', 'Watchable', 'Good']);
});

test('filterRecommendations can surface least-bad avoid beaches when enabled', () => {
    const recommendations = [
        { beach: { name: 'Worst' }, state: 'avoid', score: 15 },
        { beach: { name: 'Less bad' }, state: 'avoid', score: 36 }
    ];

    const filtered = filterRecommendations(recommendations, {
        states: { best: true, good: true, watch: true, avoid: false },
        showBeaches: true,
        showAllWhenZoomedOut: true,
        minimumScore: 30,
        includeLeastBad: true
    }, 13);

    assert.deepEqual(filtered.map((item) => item.beach.name), ['Less bad']);
});

test('getSafetyNotices surfaces risk and missing data', () => {
    assert.deepEqual(getSafetyNotices({ windSpeed: 34, swellHeight: 1.6, forecastData: forecast }), [
        'Strong wind may make entry, exit, and surface swims harder.',
        'Larger swell may reduce visibility and comfort near reefs.'
    ]);

    assert.ok(getSafetyNotices({ windSpeed: 10, swellHeight: null, forecastData: null }).some((notice) => notice.includes('Forecast unavailable')));
}
);

test('getInitialFocusRecommendations prefers nearby beaches suitable in the next six hours', () => {
    const recommendations = buildRecommendations(beaches, forecast, 0);

    const focus = getInitialFocusRecommendations(recommendations, forecast, 0, {
        lat: -32.005,
        lon: 115.51
    });

    assert.deepEqual(focus.map((item) => item.beach.name), [
        'Sheltered Bay',
        'Flexible Cove',
        'Open Reef'
    ]);
    assert.ok(focus[0].focus.distanceKm < focus[1].focus.distanceKm);
    assert.ok(focus.every((item) => item.focus.bestWithinHours <= 6));
});

test('getInitialFocusRecommendations falls back to best upcoming suitability without location', () => {
    const recommendations = buildRecommendations(beaches, forecast, 1);

    const focus = getInitialFocusRecommendations(recommendations, forecast, 1, null, 2);

    assert.equal(focus.length, 2);
    assert.deepEqual(focus.map((item) => item.beach.name), [
        'Flexible Cove',
        'Sheltered Bay'
    ]);
    assert.ok(focus[0].focus.bestUpcomingScore >= focus[1].focus.bestUpcomingScore);
});

test('getInitialFocusRecommendations returns no beach focus when nothing looks good now', () => {
    const roughNowForecast = {
        ...forecast,
        windspeed_10m: [40, 12, 12, 12],
        winddirection_10m: [45, 225, 225, 225],
        swell_wave_height: [1.8, 0.5, 0.5, 0.5]
    };
    const recommendations = buildRecommendations(beaches, roughNowForecast, 0);

    assert.ok(recommendations.every((item) => item.state === 'avoid'));
    assert.deepEqual(getInitialFocusRecommendations(recommendations, roughNowForecast, 0), []);
});

test('getInitialFocusRecommendations ignores far-away user locations', () => {
    const recommendations = buildRecommendations(beaches, forecast, 1);
    const perthLocation = { lat: -31.9523, lon: 115.8613 };

    assert.equal(shouldUseUserLocationForFocus(recommendations, perthLocation), false);

    const focus = getInitialFocusRecommendations(recommendations, forecast, 1, perthLocation, 2);
    const fallback = getInitialFocusRecommendations(recommendations, forecast, 1, null, 2);

    assert.deepEqual(
        focus.map((item) => item.beach.name),
        fallback.map((item) => item.beach.name)
    );
});

test('user location focus requires being inside Rottnest bounds, not merely nearby', () => {
    const recommendations = buildRecommendations(beaches, forecast, 0);
    const oceanNorthOfRottnest = { lat: -31.94, lon: 115.51 };

    assert.equal(shouldUseUserLocationForFocus(recommendations, oceanNorthOfRottnest), false);
});

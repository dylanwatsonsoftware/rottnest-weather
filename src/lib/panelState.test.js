import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getDefaultPanelMode,
    getForecastRange,
    getForecastSliderMax,
    getLaterTabHourIndex,
    getNextPanelMode,
    getPanelModeAfterOpenRequest,
    getRangeModeLabel,
    getRangeModeForHourIndex,
    getForecastChartDensity,
    getForecastChartLabels,
    shouldShowConfidenceLabel
} from './panelState.js';

const hourlyForecast = {
    time: [
        '2026-07-20T00:00',
        '2026-07-20T06:00',
        '2026-07-20T12:00',
        '2026-07-20T18:00',
        '2026-07-20T19:00',
        '2026-07-21T06:00',
        '2026-07-21T18:00',
        '2026-07-22T06:00',
        '2026-07-22T18:00',
        '2026-07-23T06:00',
        '2026-07-23T18:00',
        '2026-07-24T06:00',
        '2026-07-24T18:00',
        '2026-07-25T06:00',
        '2026-07-25T18:00',
        '2026-07-26T06:00',
        '2026-07-26T18:00',
        '2026-07-27T06:00',
        '2026-07-27T18:00',
        '2026-07-28T06:00',
        '2026-07-28T18:00',
        '2026-07-29T06:00',
        '2026-07-29T18:00',
        '2026-07-30T06:00'
    ]
};

test('getDefaultPanelMode starts collapsed', () => {
    assert.equal(getDefaultPanelMode(), 'collapsed');
});

test('getNextPanelMode collapses an expanded panel', () => {
    assert.equal(getNextPanelMode('expanded'), 'collapsed');
});

test('getNextPanelMode expands a collapsed panel', () => {
    assert.equal(getNextPanelMode('collapsed'), 'expanded');
});

test('getNextPanelMode recovers unknown state to expanded', () => {
    assert.equal(getNextPanelMode('mystery'), 'expanded');
});

test('getForecastSliderMax uses the last forecast index', () => {
    assert.equal(getForecastSliderMax({ time: ['a', 'b', 'c'] }), 2);
});

test('getForecastSliderMax falls back to zero without forecast times', () => {
    assert.equal(getForecastSliderMax(null), 0);
    assert.equal(getForecastSliderMax({ time: [] }), 0);
});

test('getForecastRange defaults to 6am through 6pm today', () => {
    assert.deepEqual(getForecastRange(hourlyForecast, 'today'), { min: 1, max: 3 });
});

test('getForecastRange expands to two, three, and ten day forecast windows', () => {
    assert.deepEqual(getForecastRange(hourlyForecast, 'twoDay'), { min: 0, max: 6 });
    assert.deepEqual(getForecastRange(hourlyForecast, 'threeDay'), { min: 0, max: 8 });
    assert.deepEqual(getForecastRange(hourlyForecast, 'tenDay'), { min: 0, max: 22 });
});

test('getForecastRange falls back to all times when daylight hours are missing', () => {
    assert.deepEqual(getForecastRange({ time: ['2026-07-20T01:00', '2026-07-20T02:00'] }, 'today'), { min: 0, max: 1 });
});

test('getRangeModeLabel returns compact button labels', () => {
    assert.equal(getRangeModeLabel('today'), 'Today');
    assert.equal(getRangeModeLabel('twoDay'), '2 days');
    assert.equal(getRangeModeLabel('threeDay'), '3 days');
    assert.equal(getRangeModeLabel('tenDay'), '10 days');
});

test('getForecastChartLabels uses sparse day labels for ten day forecasts', () => {
    const labels = getForecastChartLabels(
        [
            '2026-07-20T00:00',
            '2026-07-20T12:00',
            '2026-07-21T00:00',
            '2026-07-21T12:00',
            '2026-07-22T00:00'
        ],
        { min: 0, max: 4 },
        'tenDay'
    );

    assert.deepEqual(labels, ['Mon 20', '', 'Tue 21', '', 'Wed 22']);
});

test('getForecastChartDensity reduces visual noise for long ranges', () => {
    assert.deepEqual(getForecastChartDensity('today', { min: 6, max: 18 }), {
        windArrowEvery: 3,
        maxTicksLimit: 6,
        pointRadius: 3,
        windArrowSize: 14
    });
    assert.deepEqual(getForecastChartDensity('tenDay', { min: 0, max: 239 }), {
        windArrowEvery: 24,
        maxTicksLimit: 8,
        pointRadius: 0,
        windArrowSize: 11
    });
});

test('getLaterTabHourIndex jumps to the earliest future good window', () => {
    const recommendations = [
        { nextGood: { hourIndex: 8 } },
        { nextGood: { hourIndex: 5 } },
        { nextGood: { hourIndex: 2 } }
    ];

    assert.equal(getLaterTabHourIndex(recommendations, 3, hourlyForecast), 5);
});

test('getLaterTabHourIndex falls back a few hours when no future good window exists', () => {
    const recommendations = [
        { nextGood: { hourIndex: 1 } }
    ];

    assert.equal(getLaterTabHourIndex(recommendations, 3, hourlyForecast), 6);
});

test('getRangeModeForHourIndex expands range to include the selected hour', () => {
    assert.equal(getRangeModeForHourIndex(hourlyForecast, 2), 'today');
    assert.equal(getRangeModeForHourIndex(hourlyForecast, 5), 'twoDay');
    assert.equal(getRangeModeForHourIndex(hourlyForecast, 8), 'threeDay');
    assert.equal(getRangeModeForHourIndex(hourlyForecast, 13), 'tenDay');
});

test('shouldShowConfidenceLabel hides normal confidence', () => {
    assert.equal(shouldShowConfidenceLabel('normal'), false);
});

test('shouldShowConfidenceLabel shows non-normal confidence', () => {
    assert.equal(shouldShowConfidenceLabel('low'), true);
});

test('getPanelModeAfterOpenRequest expands when a new request arrives', () => {
    assert.equal(getPanelModeAfterOpenRequest('collapsed', 2, 1), 'expanded');
});

test('getPanelModeAfterOpenRequest keeps current mode for an already handled request', () => {
    assert.equal(getPanelModeAfterOpenRequest('collapsed', 2, 2), 'collapsed');
});

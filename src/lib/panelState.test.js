import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getDefaultPanelMode,
    getForecastRange,
    getForecastSliderMax,
    getSliderHeatGradient,
    getLaterTabHourIndex,
    getNextPanelMode,
    getPanelModeAfterOpenRequest,
    getPanelModeFromSwipe,
    getRecommendationHeading,
    getBetterTimeSelection,
    getRangeModeLabel,
    getRangeModeForHourIndex,
    getForecastChartDensity,
    getForecastChartLabels,
    getRangeProgressPercent,
    getStatusWindowSummary,
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

test('getDefaultPanelMode starts closed', () => {
    assert.equal(getDefaultPanelMode(), 'closed');
});

test('getNextPanelMode moves an open panel back to semi-open', () => {
    assert.equal(getNextPanelMode('open'), 'semi');
});

test('getNextPanelMode cycles closed to semi to open', () => {
    assert.equal(getNextPanelMode('closed'), 'semi');
    assert.equal(getNextPanelMode('semi'), 'open');
});

test('getNextPanelMode recovers unknown state to semi-open', () => {
    assert.equal(getNextPanelMode('mystery'), 'semi');
});

test('getPanelModeFromSwipe steps or jumps based on swipe distance', () => {
    assert.equal(getPanelModeFromSwipe('closed', -52), 'semi');
    assert.equal(getPanelModeFromSwipe('semi', -52), 'open');
    assert.equal(getPanelModeFromSwipe('closed', -148), 'open');
    assert.equal(getPanelModeFromSwipe('open', 52), 'semi');
    assert.equal(getPanelModeFromSwipe('semi', 52), 'closed');
    assert.equal(getPanelModeFromSwipe('open', 148), 'closed');
    assert.equal(getPanelModeFromSwipe('semi', 18), 'semi');
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

test('getRecommendationHeading labels the selected forecast time truthfully', () => {
    assert.equal(
        getRecommendationHeading(hourlyForecast, 2, new Date('2026-07-20T12:20')),
        'Best now'
    );
    assert.equal(
        getRecommendationHeading(hourlyForecast, 3, new Date('2026-07-20T12:20')),
        'Best at 6pm'
    );
    assert.equal(
        getRecommendationHeading(hourlyForecast, 5, new Date('2026-07-20T12:20')),
        'Best Tue 6am'
    );
});

test('getStatusWindowSummary describes the contiguous selected status window', () => {
    const timeline = [
        { hourIndex: 0, state: 'avoid' },
        { hourIndex: 1, state: 'good' },
        { hourIndex: 2, state: 'good' },
        { hourIndex: 3, state: 'good' },
        { hourIndex: 4, state: 'watch' }
    ];

    assert.equal(getStatusWindowSummary(timeline, 2), 'Good for 3 hours');
    assert.equal(getStatusWindowSummary(timeline, 4), 'Use caution for 1 hour');
});

test('getStatusWindowSummary falls back when selected hour is unavailable', () => {
    assert.equal(getStatusWindowSummary([], 2), 'Forecast window unavailable');
    assert.equal(getStatusWindowSummary([{ hourIndex: 1, state: 'good' }], 2), 'Forecast window unavailable');
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

test('getSliderHeatGradient paints hard stops for each forecast hour', () => {
    const gradient = getSliderHeatGradient([
        { hourIndex: 0, state: 'best' },
        { hourIndex: 1, state: 'avoid' }
    ], { min: 0, max: 1 });

    assert.equal(
        gradient,
        'linear-gradient(to right, #167a52 0.00%, #167a52 50.00%, #b44545 50.00%, #b44545 100.00%)'
    );
});

test('getSliderHeatGradient shows unknown color for missing timeline hours', () => {
    const gradient = getSliderHeatGradient([
        { hourIndex: 1, state: 'watch' }
    ], { min: 0, max: 2 });

    assert.equal(
        gradient,
        'linear-gradient(to right, #dbe5e5 0.00%, #dbe5e5 33.33%, #c58a24 33.33%, #c58a24 66.67%, #dbe5e5 66.67%, #dbe5e5 100.00%)'
    );
});

test('getSliderHeatGradient falls back to a neutral track without timeline data', () => {
    assert.equal(getSliderHeatGradient([], { min: 0, max: 2 }), '#dbe5e5');
});

test('getRangeProgressPercent locates the selected hour within a forecast range', () => {
    assert.equal(getRangeProgressPercent({ min: 6, max: 18 }, 6), 0);
    assert.equal(getRangeProgressPercent({ min: 6, max: 18 }, 12), 50);
    assert.equal(getRangeProgressPercent({ min: 6, max: 18 }, 18), 100);
    assert.equal(getRangeProgressPercent({ min: 6, max: 18 }, 20), 100);
    assert.equal(getRangeProgressPercent({ min: 6, max: 6 }, 6), 0);
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

test('getBetterTimeSelection jumps to a better hour and expands the forecast range as needed', () => {
    const recommendations = [
        { nextGood: { hourIndex: 8 } },
        { nextGood: { hourIndex: 5 } }
    ];

    assert.deepEqual(getBetterTimeSelection(recommendations, 3, hourlyForecast), {
        hourIndex: 5,
        rangeMode: 'twoDay'
    });
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

test('getPanelModeAfterOpenRequest opens when a new request arrives', () => {
    assert.equal(getPanelModeAfterOpenRequest('semi', 2, 1), 'open');
});

test('getPanelModeAfterOpenRequest keeps current mode for an already handled request', () => {
    assert.equal(getPanelModeAfterOpenRequest('semi', 2, 2), 'semi');
});

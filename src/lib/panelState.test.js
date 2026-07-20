import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getDefaultPanelMode,
    getForecastRange,
    getForecastSliderMax,
    getNextPanelMode,
    getPanelModeAfterOpenRequest,
    getRangeModeLabel,
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
        '2026-07-23T06:00'
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

test('getForecastRange expands to two and three day forecast windows', () => {
    assert.deepEqual(getForecastRange(hourlyForecast, 'twoDay'), { min: 0, max: 6 });
    assert.deepEqual(getForecastRange(hourlyForecast, 'threeDay'), { min: 0, max: 8 });
});

test('getForecastRange falls back to all times when daylight hours are missing', () => {
    assert.deepEqual(getForecastRange({ time: ['2026-07-20T01:00', '2026-07-20T02:00'] }, 'today'), { min: 0, max: 1 });
});

test('getRangeModeLabel returns compact button labels', () => {
    assert.equal(getRangeModeLabel('today'), 'Today');
    assert.equal(getRangeModeLabel('twoDay'), '2 days');
    assert.equal(getRangeModeLabel('threeDay'), '3 days');
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getDefaultPanelMode,
    getForecastSliderMax,
    getNextPanelMode,
    getPanelModeAfterOpenRequest,
    shouldShowConfidenceLabel
} from './panelState.js';

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

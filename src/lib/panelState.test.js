import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextPanelMode } from './panelState.js';

test('getNextPanelMode collapses an expanded panel', () => {
    assert.equal(getNextPanelMode('expanded'), 'collapsed');
});

test('getNextPanelMode expands a collapsed panel', () => {
    assert.equal(getNextPanelMode('collapsed'), 'expanded');
});

test('getNextPanelMode recovers unknown state to expanded', () => {
    assert.equal(getNextPanelMode('mystery'), 'expanded');
});

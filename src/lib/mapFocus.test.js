import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getInitialFitSettings,
    getLandmarkFitPoints,
    getBeachSelectionMapTarget,
    getMapNavigationTarget,
    getPanelModePanOffset,
    getVisibleBeachFitReason,
    getVisibleBeachFitPoints,
    getVisibleBeachFitSettings
} from './mapFocus.js';

test('getLandmarkFitPoints uses every known landmark coordinate for initial load', () => {
    const points = getLandmarkFitPoints([
        { name: 'A', lat: -31.99, lon: 115.54 },
        { name: 'Missing latitude', lon: 115.52 },
        { name: 'B', lat: -32.02, lon: 115.53 }
    ]);

    assert.deepEqual(points, [
        [-31.99, 115.54],
        [-32.02, 115.53]
    ]);
});

test('initial landmark fit keeps controls and collapsed tray clear', () => {
    const settings = getInitialFitSettings();

    assert.equal(settings.minZoom, null);
    assert.deepEqual(settings.fitBoundsOptions.paddingTopLeft, [42, 150]);
    assert.ok(settings.fitBoundsOptions.paddingBottomRight[1] >= 180);
});

test('getMapNavigationTarget creates a stable map destination', () => {
    assert.deepEqual(getMapNavigationTarget({ name: 'The Basin', lat: -31.9892, lon: 115.5351 }), {
        name: 'The Basin',
        lat: -31.9892,
        lon: 115.5351,
        zoom: 15,
        offset: [0, 180]
    });
});

test('getMapNavigationTarget ignores unmappable places', () => {
    assert.equal(getMapNavigationTarget({ name: 'Missing' }), null);
});

test('getBeachSelectionMapTarget centers selected beaches with panel offset', () => {
    assert.deepEqual(getBeachSelectionMapTarget({ name: 'Parker Point', lat: -32.023, lon: 115.528 }), {
        name: 'Parker Point',
        lat: -32.023,
        lon: 115.528,
        zoom: 15,
        offset: [0, 180]
    });
});

test('getVisibleBeachFitPoints uses currently shown beach recommendations', () => {
    const points = getVisibleBeachFitPoints([
        { beach: { name: 'A', lat: -31.99, lon: 115.54 } },
        { beach: { name: 'Missing latitude', lon: 115.52 } },
        { beach: { name: 'B', lat: -32.02, lon: 115.53 } }
    ]);

    assert.deepEqual(points, [
        [-31.99, 115.54],
        [-32.02, 115.53]
    ]);
});

test('visible beach fit leaves room for header and collapsed tray', () => {
    const settings = getVisibleBeachFitSettings('collapsed');

    assert.deepEqual(settings.fitBoundsOptions.paddingTopLeft, [42, 140]);
    assert.ok(settings.fitBoundsOptions.paddingBottomRight[1] >= 160);
    assert.equal(settings.fitBoundsOptions.maxZoom, 14);
    assert.equal(settings.singleBeachZoom, 14);
});

test('visible beach fit uses deeper bottom padding for expanded panel', () => {
    const collapsed = getVisibleBeachFitSettings('collapsed');
    const expanded = getVisibleBeachFitSettings('expanded');

    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[1] > collapsed.fitBoundsOptions.paddingBottomRight[1]);
    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[1] >= 360);
});

test('visible beach fit preserves zoom when only panel mode changes', () => {
    assert.equal(getVisibleBeachFitReason('a|b', 'a|b', 'collapsed', 'expanded'), 'panel');
    assert.equal(getVisibleBeachFitReason('a|b', 'a|c', 'collapsed', 'collapsed'), 'points');
    assert.equal(getVisibleBeachFitReason('a|b', 'a|b', 'collapsed', 'collapsed'), 'none');
});

test('panel mode pan offset adjusts center without changing zoom', () => {
    assert.deepEqual(getPanelModePanOffset('collapsed', 'expanded'), [0, 180]);
    assert.deepEqual(getPanelModePanOffset('expanded', 'collapsed'), [0, -180]);
    assert.deepEqual(getPanelModePanOffset('collapsed', 'collapsed'), [0, 0]);
});

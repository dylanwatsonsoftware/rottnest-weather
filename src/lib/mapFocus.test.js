import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getInitialFitSettings,
    getLandmarkFitPoints,
    getBeachSelectionMapTarget,
    getPanelModeSelectionMapTarget,
    getMapLayoutChangeTarget,
    getMapLayout,
    getMapNavigationTarget,
    getNavigationSettleDelay,
    getPanelModeMapOffset,
    getPanelModePanOffset,
    getBeachMarkerSize,
    getGoodBeachOverlayAreas,
    shouldShowBeachLabel,
    shouldShowBeachMarker,
    shouldShowPlaceMarker,
    shouldShowPlaceLabel,
    getVisibleMapAnchorOffset,
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
    assert.deepEqual(getBeachSelectionMapTarget({ name: 'Parker Point', lat: -32.023, lon: 115.528 }, 'open'), {
        name: 'Parker Point',
        lat: -32.023,
        lon: 115.528,
        zoom: 16,
        offset: [0, 320],
        visibleAnchor: {
            targetXRatio: 0.5,
            targetYRatio: 0.5,
            constrainVerticalByPanel: true,
            waitForPanelTransition: true
        }
    });
});

test('getPanelModeSelectionMapTarget recenters selected beaches at current zoom after panel swipes', () => {
    assert.deepEqual(getPanelModeSelectionMapTarget(
        { name: 'Parker Point', lat: -32.023, lon: 115.528 },
        'open',
        'default',
        13
    ), {
        name: 'Parker Point',
        lat: -32.023,
        lon: 115.528,
        zoom: 13,
        offset: [0, 320],
        visibleAnchor: {
            targetXRatio: 0.5,
            targetYRatio: 0.5,
            constrainVerticalByPanel: true,
            waitForPanelTransition: true
        }
    });
    assert.equal(getPanelModeSelectionMapTarget({ name: 'Missing' }, 'open', 'default', 13), null);
});

test('getMapLayout detects short landscape phones', () => {
    assert.equal(getMapLayout({ width: 780, height: 390 }), 'shortLandscape');
    assert.equal(getMapLayout({ width: 390, height: 780 }), 'default');
    assert.equal(getMapLayout({ width: 900, height: 700 }), 'desktopSidePanel');
});

test('getMapLayoutChangeTarget recenters selected beach when orientation layout changes', () => {
    const beach = { name: 'Little Salmon Bay', lat: -32.0242, lon: 115.5251 };

    assert.deepEqual(getMapLayoutChangeTarget(beach, 'open', 'default', 'shortLandscape'), {
        name: 'Little Salmon Bay',
        lat: -32.0242,
        lon: 115.5251,
        zoom: 16,
        offset: [360, 0],
        visibleAnchor: {
            targetXRatio: 0.5,
            targetYRatio: 0.5,
            constrainVerticalByPanel: true,
            waitForPanelTransition: true
        }
    });
    assert.equal(getMapLayoutChangeTarget(beach, 'open', 'default', 'default'), null);
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

test('visible beach fit leaves room for header and semi-open tray', () => {
    const settings = getVisibleBeachFitSettings('semi');

    assert.deepEqual(settings.fitBoundsOptions.paddingTopLeft, [42, 140]);
    assert.ok(settings.fitBoundsOptions.paddingBottomRight[1] >= 160);
    assert.equal(settings.fitBoundsOptions.maxZoom, 14);
    assert.equal(settings.singleBeachZoom, 14);
});

test('visible beach fit uses deeper bottom padding for open panel', () => {
    const collapsed = getVisibleBeachFitSettings('semi');
    const expanded = getVisibleBeachFitSettings('open');

    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[1] > collapsed.fitBoundsOptions.paddingBottomRight[1]);
    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[1] >= 520);
});

test('short landscape visible beach fit leaves room for the side panel', () => {
    const collapsed = getVisibleBeachFitSettings('semi', 'shortLandscape');
    const expanded = getVisibleBeachFitSettings('open', 'shortLandscape');

    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[0] > collapsed.fitBoundsOptions.paddingBottomRight[0]);
    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[0] >= 360);
    assert.ok(expanded.fitBoundsOptions.paddingBottomRight[1] < 100);
});

test('desktop visible beach fit leaves room for the side panel without bottom-sheet padding', () => {
    const semi = getVisibleBeachFitSettings('semi', 'desktopSidePanel');
    const open = getVisibleBeachFitSettings('open', 'desktopSidePanel');

    assert.ok(open.fitBoundsOptions.paddingBottomRight[0] > semi.fitBoundsOptions.paddingBottomRight[0]);
    assert.ok(open.fitBoundsOptions.paddingBottomRight[1] < 220);
});

test('visible beach fit preserves zoom when only panel mode changes', () => {
    assert.equal(getVisibleBeachFitReason('a|b', 'a|b', 'semi', 'open'), 'panel');
    assert.equal(getVisibleBeachFitReason('a|b', 'a|c', 'semi', 'semi'), 'points');
    assert.equal(getVisibleBeachFitReason('a|b', 'a|b', 'semi', 'semi'), 'none');
});

test('explicit beach selection suppresses visible-beach refits from zoom-driven marker changes', () => {
    assert.equal(getVisibleBeachFitReason('a|b', 'a|b|c', 'open', 'open', 'default', 'default', true), 'none');
    assert.equal(getVisibleBeachFitReason('a|b', 'a|b', 'semi', 'open', 'default', 'default', true), 'panel');
});

test('panel mode pan offset adjusts center without changing zoom', () => {
    assert.deepEqual(getPanelModePanOffset('semi', 'open'), [0, 300]);
    assert.deepEqual(getPanelModePanOffset('open', 'semi'), [0, -300]);
    assert.deepEqual(getPanelModePanOffset('closed', 'semi'), [0, 0]);
});

test('short landscape panel mode pan offset adjusts horizontally', () => {
    assert.deepEqual(getPanelModePanOffset('semi', 'open', 'shortLandscape'), [280, -90]);
    assert.deepEqual(getPanelModePanOffset('open', 'semi', 'shortLandscape'), [-280, 90]);
});

test('panel mode map offsets leave extra room for open sheet', () => {
    assert.deepEqual(getPanelModeMapOffset('semi'), [0, 180]);
    assert.deepEqual(getPanelModeMapOffset('open'), [0, 320]);
    assert.deepEqual(getPanelModeMapOffset('semi', 'shortLandscape'), [170, 90]);
    assert.deepEqual(getPanelModeMapOffset('open', 'shortLandscape'), [360, 0]);
    assert.deepEqual(getPanelModeMapOffset('semi', 'desktopSidePanel'), [0, 0]);
    assert.deepEqual(getPanelModeMapOffset('open', 'desktopSidePanel'), [220, 0]);
});

test('visible map anchor offset centers selected items inside the unobscured map area', () => {
    assert.deepEqual(getVisibleMapAnchorOffset({
        mapWidth: 390,
        mapHeight: 800,
        visibleTop: 80,
        visibleBottom: 500,
        targetYRatio: 0.5
    }), [0, 110]);

    assert.deepEqual(getVisibleMapAnchorOffset({
        mapWidth: 800,
        mapHeight: 390,
        visibleRight: 480,
        targetXRatio: 0.5,
        targetYRatio: 0.5
    }), [160, 0]);
});

test('visible map anchor offset can center selected items in the map viewport below the header', () => {
    assert.deepEqual(getVisibleMapAnchorOffset({
        mapWidth: 390,
        mapHeight: 800,
        visibleTop: 80,
        visibleBottom: 800,
        targetYRatio: 0.5
    }), [0, -40]);
});

test('selected beach navigation waits for the expanding panel to settle before measuring', () => {
    const target = getBeachSelectionMapTarget({ name: 'Parker Point', lat: -32.023, lon: 115.528 }, 'open');

    assert.ok(getNavigationSettleDelay(target) >= 200);
    assert.equal(getNavigationSettleDelay(getMapNavigationTarget({ name: 'Jetty', lat: -32, lon: 115.5 })), 0);
});

test('beach labels are capped by zoom and recommendation rank to reduce map clutter', () => {
    const recommendation = { beach: { name: 'Little Salmon Bay' }, state: 'watch', score: 50 };

    assert.equal(shouldShowBeachLabel(recommendation, 12, '', 0), true);
    assert.equal(shouldShowBeachLabel(recommendation, 12, '', 3), false);
    assert.equal(shouldShowBeachLabel(recommendation, 13, '', 5), true);
    assert.equal(shouldShowBeachLabel(recommendation, 13, '', 6), false);
    assert.equal(shouldShowBeachLabel(recommendation, 15, '', 20), true);
});

test('selected and best beaches keep labels even when lower ranked', () => {
    assert.equal(shouldShowBeachLabel(
        { beach: { name: 'Selected Bay' }, state: 'avoid', score: 20 },
        12,
        'Selected Bay',
        12
    ), true);
    assert.equal(shouldShowBeachLabel(
        { beach: { name: 'Best Bay' }, state: 'best', score: 90 },
        12,
        '',
        12
    ), true);
});

test('beach marker sizes shrink lower ranked beaches at cluttered zooms', () => {
    assert.deepEqual(getBeachMarkerSize(
        { beach: { name: 'Selected Bay' }, state: 'avoid' },
        12,
        'Selected Bay',
        12
    ), { size: 40, anchor: 20 });

    assert.deepEqual(getBeachMarkerSize(
        { beach: { name: 'Best Bay' }, state: 'best' },
        12,
        '',
        18
    ), { size: 38, anchor: 19 });

    assert.deepEqual(getBeachMarkerSize(
        { beach: { name: 'Okay Bay' }, state: 'good' },
        12,
        '',
        2
    ), { size: 34, anchor: 17 });

    assert.deepEqual(getBeachMarkerSize(
        { beach: { name: 'Lower Bay' }, state: 'watch' },
        12,
        '',
        8
    ), { size: 28, anchor: 14 });

    assert.deepEqual(getBeachMarkerSize(
        { beach: { name: 'Tiny Bay' }, state: 'avoid' },
        11,
        '',
        14
    ), { size: 24, anchor: 12 });

    assert.deepEqual(getBeachMarkerSize(
        { beach: { name: 'Zoomed Bay' }, state: 'avoid' },
        15,
        '',
        14
    ), { size: 34, anchor: 17 });
});

test('good beach overlay groups nearby beaches into generalized areas', () => {
    const areas = getGoodBeachOverlayAreas([
        { beach: { name: 'North A', lat: -31.99, lon: 115.52 }, state: 'good', score: 74 },
        { beach: { name: 'North B', lat: -31.991, lon: 115.523 }, state: 'best', score: 88 },
        { beach: { name: 'South', lat: -32.03, lon: 115.54 }, state: 'good', score: 72 },
        { beach: { name: 'Avoided', lat: -32.04, lon: 115.55 }, state: 'avoid', score: 18 }
    ]);

    assert.equal(areas.length, 2);
    assert.equal(areas[0].state, 'best');
    assert.deepEqual(areas[0].beachNames, ['North A', 'North B']);
    assert.equal(areas[0].points.length, 4);
    assert.ok(areas[0].points.every((point) => Number.isFinite(point[0]) && Number.isFinite(point[1])));
    assert.deepEqual(areas[1].beachNames, ['South']);
});

test('low zoom beach markers only show selected, best, and top ranked beaches over the overlay', () => {
    assert.equal(shouldShowBeachMarker({ beach: { name: 'Selected' }, state: 'avoid' }, 12, 'Selected', 12), true);
    assert.equal(shouldShowBeachMarker({ beach: { name: 'Best' }, state: 'best' }, 12, '', 12), true);
    assert.equal(shouldShowBeachMarker({ beach: { name: 'Top ranked' }, state: 'good' }, 12, '', 1), true);
    assert.equal(shouldShowBeachMarker({ beach: { name: 'Lower ranked' }, state: 'good' }, 12, '', 4), false);
    assert.equal(shouldShowBeachMarker({ beach: { name: 'Zoomed in' }, state: 'good' }, 13, '', 12), true);
});

test('place labels stay hidden unless the place was selected', () => {
    const place = { name: 'Parker Point Stop', type: 'facility' };

    assert.equal(shouldShowPlaceLabel(place, 15, ''), false);
    assert.equal(shouldShowPlaceLabel(place, 15, 'Parker Point Stop'), true);
    assert.equal(shouldShowPlaceLabel(place, 11, 'Parker Point Stop'), true);
});

test('place markers use category priority to reduce map clutter', () => {
    assert.equal(shouldShowPlaceMarker({ name: 'Bathurst Lighthouse', type: 'landmark', subtype: 'lighthouse' }, 10), true);
    assert.equal(shouldShowPlaceMarker({ name: "Pinky's Beach Club", type: 'facility', category: 'restaurant' }, 13), true);
    assert.equal(shouldShowPlaceMarker({ name: 'Parker Point Stop', type: 'facility', category: 'bus_stop' }, 13), false);
    assert.equal(shouldShowPlaceMarker({ name: 'Parker Point Stop', type: 'facility', category: 'bus_stop' }, 14), true);
    assert.equal(shouldShowPlaceMarker({ name: 'Parker Point Facilities', type: 'facility', category: 'toilets' }, 14), false);
    assert.equal(shouldShowPlaceMarker({ name: 'Parker Point Facilities', type: 'facility', category: 'toilets' }, 15), true);
    assert.equal(shouldShowPlaceMarker({ name: 'Parker Point Facilities', type: 'facility', category: 'toilets' }, 11, 'Parker Point Facilities'), true);
});

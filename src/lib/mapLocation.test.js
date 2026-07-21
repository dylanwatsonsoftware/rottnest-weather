import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mapSource = readFileSync(new URL('./Map.svelte', import.meta.url), 'utf8');

test('map watches location without moving the map view', () => {
    assert.match(mapSource, /map\.locate\(\{\s*setView:\s*false,\s*watch:\s*true\s*\}\)/);
});

test('map only exposes user location markers inside Rottnest bounds while keeping distance origin available', () => {
    assert.match(mapSource, /import \{ isWithinRottnestBounds \} from '\.\/recommendations\.js';/);
    assert.match(mapSource, /if \(!isWithinRottnestBounds\(location\)\)\s*\{/);
    assert.match(mapSource, /clearUserLocation\(\);/);
    assert.match(mapSource, /onUserLocationChange\(location\);[\s\S]*if \(!isWithinRottnestBounds\(location\)\)\s*\{/);
    assert.doesNotMatch(mapSource, /onUserLocationChange\(null\);[\s\S]*return;/);
    assert.match(mapSource, /onUserLocationChange\(location\);/);
});

test('map highlights selected nearby places with a visible label', () => {
    assert.match(mapSource, /const selectedPlaceName = \$derived/);
    assert.match(mapSource, /const selectedPlaceDistanceLabel = \$derived/);
    assert.match(mapSource, /getPlaceTooltipLabel\(place\)/);
    assert.match(mapSource, /`\$\{place\.name\} · \$\{selectedPlaceDistanceLabel\}`/);
    assert.match(mapSource, /mapNavigationRequest\?\.type === 'landmark'/);
    assert.match(mapSource, /mapNavigationRequest\?\.type === 'facility'/);
    assert.match(mapSource, /mapNavigationRequest\?\.type === 'business'/);
    assert.match(mapSource, /shouldShowPlaceLabel\(place,\s*currentZoom,\s*selectedPlaceName\)/);
    assert.match(mapSource, /className: `landmark-icon \$\{place\.type\} \$\{place\.category \|\| place\.subtype \|\| ''\} \$\{selected\}`/);
    assert.match(mapSource, /if \(selected\) marker\.setZIndexOffset\(1000\)/);
});

test('map place markers have a direct DOM click path for custom div icons', () => {
    assert.match(mapSource, /const selectPlace = \(\) => \{/);
    assert.match(mapSource, /mapElement\.addEventListener\('click',\s*handleMapElementClick\)/);
    assert.match(mapSource, /function handleMapElementClick\(event\)/);
    assert.match(mapSource, /event\.target\.closest\?\.\('\.landmark-icon'\)/);
    assert.match(mapSource, /placeClickTargets\.get\(placeKey\)/);
    assert.match(mapSource, /attachPlaceClickTarget\(marker,\s*selectPlace,\s*placeKey\)/);
    assert.match(mapSource, /function attachPlaceClickTarget\(marker,\s*selectPlace,\s*placeKey\)/);
    assert.match(mapSource, /requestAnimationFrame\(\(\) => \{/);
    assert.match(mapSource, /markerElement\.onclick = \(event\) => \{/);
    assert.match(mapSource, /markerElement\.dataset\.placeKey = placeKey/);
});

test('manual zoom recenters the selected navigation request at the new zoom level', () => {
    const zoomHandlerStart = mapSource.indexOf("map.on('zoomend'");
    assert.notEqual(zoomHandlerStart, -1);
    const zoomHandlerEnd = mapSource.indexOf('});', zoomHandlerStart);
    const zoomHandler = mapSource.slice(zoomHandlerStart, zoomHandlerEnd);

    assert.match(zoomHandler, /currentZoom = nextZoom/);
    assert.match(zoomHandler, /recenterSelectedNavigationOnZoom\(nextZoom\)/);
    assert.match(mapSource, /let isProgrammaticMapMove = false/);
    assert.match(mapSource, /function recenterSelectedNavigationOnZoom\(zoom\)/);
    assert.match(mapSource, /if \(!mapNavigationRequest \|\| isProgrammaticMapMove \|\| !shouldRecenterSelectedNavigation\) return/);
    assert.match(mapSource, /const center = getOffsetCenter\(mapNavigationRequest,\s*zoom\)/);
    assert.match(mapSource, /setViewProgrammatically\(center,\s*zoom,\s*\{\s*animate:\s*false\s*\}\)/);
    assert.match(mapSource, /function setViewProgrammatically\(center,\s*zoom,\s*options\)/);
    assert.match(mapSource, /map\.setView\(center,\s*zoom,\s*options\)/);
});

test('manual map dragging disables selected navigation zoom anchoring', () => {
    assert.match(mapSource, /let shouldRecenterSelectedNavigation = false/);
    assert.match(mapSource, /map\.on\('dragstart',\s*handleManualMapMove\)/);
    assert.match(mapSource, /function handleManualMapMove\(\)/);
    assert.match(mapSource, /if \(isProgrammaticMapMove\) return/);
    assert.match(mapSource, /shouldRecenterSelectedNavigation = false/);
    assert.match(mapSource, /shouldRecenterSelectedNavigation = true;[\s\S]*lastNavigationRequestId = request\.requestId/);
    assert.match(mapSource, /if \(!mapNavigationRequest \|\| isProgrammaticMapMove \|\| !shouldRecenterSelectedNavigation\) return/);
});

test('clearing the map navigation request cancels pending selected-location recenters', () => {
    assert.match(mapSource, /function cancelSelectedNavigationTracking\(\)/);
    assert.match(mapSource, /lastNavigationRequestId = null/);
    assert.match(mapSource, /shouldRecenterSelectedNavigation = false/);
    assert.match(mapSource, /if \(!request\) \{[\s\S]*cancelSelectedNavigationTracking\(\);[\s\S]*return;[\s\S]*\}/);
    assert.match(mapSource, /if \(request\.requestId !== lastNavigationRequestId\) return/);
});

test('beach marker icons use rank-aware sizes', () => {
    assert.match(mapSource, /import \{[\s\S]*getBeachMarkerSize/);
    assert.match(mapSource, /icon:\s*getBeachIcon\(recommendation,\s*index\)/);
    assert.match(mapSource, /marker\.setIcon\(getBeachIcon\(recommendation,\s*rank\)\)/);
    assert.match(mapSource, /getBeachMarkerSize\(recommendation,\s*currentZoom,\s*selectedBeachName,\s*rank\)/);
    assert.match(mapSource, /iconSize:\s*\[markerSize\.size,\s*markerSize\.size\]/);
});

test('map does not render generalized good beach area overlays', () => {
    assert.doesNotMatch(mapSource, /beachQualityOverlays/);
    assert.doesNotMatch(mapSource, /getGoodBeachOverlayAreas/);
    assert.doesNotMatch(mapSource, /function updateBeachQualityOverlay\(\)/);
    assert.doesNotMatch(mapSource, /shouldShowGoodBeachOverlay/);
    assert.doesNotMatch(mapSource, /good-beach-overlay/);
    assert.doesNotMatch(mapSource, /L\.polygon/);
    assert.match(mapSource, /shouldShowBeachMarker\(recommendation,\s*currentZoom,\s*selectedBeachName,\s*index\)/);
});

test('beach marker rebuilding does not consume panel-mode recenter transitions', () => {
    const initBeachesStart = mapSource.indexOf('function initBeaches()');
    assert.notEqual(initBeachesStart, -1);
    const updateBeachesStart = mapSource.indexOf('function updateBeaches()', initBeachesStart);
    assert.notEqual(updateBeachesStart, -1);
    const initBeachesBody = mapSource.slice(initBeachesStart, updateBeachesStart);

    assert.doesNotMatch(initBeachesBody, /fitVisibleBeaches\(\)/);
    assert.match(mapSource, /const currentPanelMode = panelMode;[\s\S]*fitVisibleBeaches\(\)/);
    assert.match(mapSource, /getPanelModeSelectionMapTarget/);
});

test('map cancels delayed selected-beach recenters after beach selection is cleared', () => {
    assert.match(mapSource, /if \(!hasExplicitBeachSelection\) \{[\s\S]*panelSelectionRecenterSequence \+= 1;[\s\S]*\}/);
    assert.match(mapSource, /if \(!map \|\| sequence !== panelSelectionRecenterSequence\) return/);
});

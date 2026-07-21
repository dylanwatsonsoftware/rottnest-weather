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

test('manual zoom does not recenter to the selected navigation request', () => {
    const zoomHandlerStart = mapSource.indexOf("map.on('zoomend'");
    assert.notEqual(zoomHandlerStart, -1);
    const zoomHandlerEnd = mapSource.indexOf('});', zoomHandlerStart);
    const zoomHandler = mapSource.slice(zoomHandlerStart, zoomHandlerEnd);

    assert.match(zoomHandler, /currentZoom = nextZoom/);
    assert.doesNotMatch(zoomHandler, /recenterSelectedNavigationOnZoom/);
    assert.doesNotMatch(mapSource, /function recenterSelectedNavigationOnZoom/);
});

test('beach marker icons use rank-aware sizes', () => {
    assert.match(mapSource, /import \{[\s\S]*getBeachMarkerSize/);
    assert.match(mapSource, /icon:\s*getBeachIcon\(recommendation,\s*index\)/);
    assert.match(mapSource, /marker\.setIcon\(getBeachIcon\(recommendation,\s*rank\)\)/);
    assert.match(mapSource, /getBeachMarkerSize\(recommendation,\s*currentZoom,\s*selectedBeachName,\s*rank\)/);
    assert.match(mapSource, /iconSize:\s*\[markerSize\.size,\s*markerSize\.size\]/);
});

test('map shows a good beach overlay when zoomed out', () => {
    assert.match(mapSource, /let beachQualityOverlays = \[\]/);
    assert.match(mapSource, /getGoodBeachOverlayAreas\(recommendations\)/);
    assert.match(mapSource, /function updateBeachQualityOverlay\(\)/);
    assert.match(mapSource, /shouldShowGoodBeachOverlay\(currentZoom\)/);
    assert.match(mapSource, /L\.polygon/);
    assert.doesNotMatch(mapSource, /L\.circleMarker/);
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

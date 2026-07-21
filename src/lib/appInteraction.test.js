import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../App.svelte', import.meta.url), 'utf8');

test('map beach selection navigates with the open panel offset it will open into', () => {
    assert.match(app, /function selectBeach\(name,\s*targetPanelMode = panelMode\)/);
    assert.match(app, /getBeachSelectionMapTarget\(beach,\s*targetPanelMode,\s*mapLayout\)/);
    assert.match(app, /selectBeach\(name,\s*'open'\)/);
    assert.doesNotMatch(app, /activeTab/);
});

test('map knows when a beach was explicitly selected by the user', () => {
    assert.match(app, /hasExplicitBeachSelection=\{Boolean\(selectedBeachName\)\}/);
});

test('nearby facility and business navigation enables the places layer', () => {
    assert.match(app, /target\.type === 'facility' \|\| target\.type === 'business'/);
});

test('non-beach map place selection clears stale beach selection', () => {
    assert.match(app, /if \(isMapPlace\) \{[\s\S]*selectedBeachName = '';[\s\S]*\}/);
});

test('non-beach map places use a dismissible selected-place mode', () => {
    assert.match(app, /let selectedMapPlace = \$state\(null\)/);
    assert.match(app, /function clearSelectedMapPlace\(\)/);
    assert.match(app, /selectedMapPlace = isMapPlace \? target : null/);
    assert.match(app, /class="selected-map-place-card"/);
    assert.match(app, /aria-label="Close selected place"/);
});

test('non-beach map place selection shrinks only a fully open recommendation panel', () => {
    assert.match(app, /const isMapPlace = isMapPlaceTarget\(target\)/);
    assert.match(app, /selectedMapPlace = isMapPlace \? target : null/);
    assert.match(app, /if \(isMapPlace && panelMode === 'open'\) \{/);
    assert.match(app, /panelMode = 'semi'/);
});

test('food and facilities layer is visible by default', () => {
    assert.match(app, /showLandmarks: true,\s+showFacilities: true,\s+showUserLocation: true/);
});

test('recommendation rows show status heatbars instead of repeating score summaries', () => {
    const panel = readFileSync(new URL('./RecommendationPanel.svelte', import.meta.url), 'utf8');

    assert.match(panel, /getStatusWindowSummary/);
    assert.match(panel, /getRecommendationHeatbar\(item\)/);
    assert.match(panel, /class="recommendation-heatbar"/);
    assert.doesNotMatch(panel, /<small>\{item\.summary\}<\/small>/);
});

test('app hydrates cached forecast data before refreshing from the network', () => {
    assert.match(app, /import \{ readForecastCache, writeForecastCache \} from '\.\/lib\/forecastCache\.js';/);
    assert.match(app, /const cachedAppData = readForecastCache\(localStorage\);/);
    assert.match(app, /applyCachedAppData\(cachedAppData\)/);
    assert.match(app, /writeForecastCache\(localStorage,/);
});

test('recommendation panel waits until forecast data is ready', () => {
    assert.match(app, /const hasLoadedForecast = \$derived\(!loading && Boolean\(forecastData\?\.time\?\.length\)\);/);
    assert.match(app, /\{#if hasLoadedForecast\}[\s\S]*<RecommendationPanel/);
});

test('app wires floating map search to all map data and navigation callbacks', () => {
    assert.match(app, /import MapSearch from '\.\/lib\/MapSearch\.svelte';/);
    assert.match(app, /<MapSearch/);
    assert.match(app, /beaches=\{\$state\.snapshot\(beaches\)\}/);
    assert.match(app, /landmarks=\{\$state\.snapshot\(landmarks\)\}/);
    assert.match(app, /facilities=\{\$state\.snapshot\(facilities\)\}/);
    assert.match(app, /onSelectBeach=\{selectSearchBeach\}/);
    assert.match(app, /onNavigateToMap=\{navigateToMapTarget\}/);
    assert.match(app, /function selectSearchBeach\(name\)/);
    assert.match(app, /selectBeach\(name,\s*'open'\)/);
    assert.match(app, /panelOpenRequest \+= 1/);
});

test('map and search beach selections request the panel detail scroll', () => {
    assert.match(app, /let panelScrollRequest = \$state\(0\)/);
    assert.match(app, /function revealBeachInPanel\(name\)/);
    assert.match(app, /panelOpenRequest \+= 1;\s+panelScrollRequest \+= 1;/);
    assert.match(app, /onSelectBeach=\{revealBeachInPanel\}/);
    assert.match(app, /\{panelScrollRequest\}/);
});

test('in-bounds user location flows into map search distance labels', () => {
    assert.match(app, /let userLocation = \$state\(null\)/);
    assert.match(app, /onUserLocationChange=\{\(location\) => userLocation = location\}/);
    assert.match(app, /\{userLocation\}[\s\S]*onSelectBeach=\{selectSearchBeach\}/);
});

test('selected beach details receive user location for distance labels', () => {
    assert.match(app, /<RecommendationPanel[\s\S]*\{userLocation\}/);
});

test('selected beach and place state is encoded in the address bar for sharing', () => {
    assert.match(app, /import \{[\s\S]*buildShareUrl[\s\S]*getSharedLocationFromUrl[\s\S]*getLocationKey[\s\S]*findNearestSharedHourIndex[\s\S]*parseSharedLocationKey[\s\S]*slugifyLocationName[\s\S]*\} from '\.\/lib\/urlState\.js';/);
    assert.match(app, /let sharedLocationState = \$state/);
    assert.match(app, /let currentShareUrl = \$state\(''\)/);
    assert.match(app, /function updateShareUrl\(\)/);
    assert.match(app, /history\.replaceState\(history\.state,\s*'',\s*nextUrl\)/);
    assert.match(app, /\$effect\(\(\) => \{[\s\S]*updateShareUrl\(\)/);
    assert.match(app, /shareUrl=\{currentShareUrl\}/);
});

test('incoming shared beach and place links are restored after app data loads', () => {
    assert.match(app, /sharedLocationState = getSharedLocationFromUrl\(window\.location\.href\)/);
    assert.match(app, /function applySharedLocationState\(appData\)/);
    assert.match(app, /findNearestSharedHourIndex\(appData\.forecastData,\s*sharedLocationState\.time\)/);
    assert.match(app, /parseSharedLocationKey\(sharedLocationState\.locationKey\)/);
    assert.match(app, /selectedBeachName = beach\.name/);
    assert.match(app, /selectedMapPlace = getSharedMapPlaceTarget\(place\)/);
});

test('selected map place card derives distance from the current user location', () => {
    assert.match(app, /import \{ formatDistanceLabel,\s*getDistanceKm/);
    assert.match(app, /const selectedMapPlaceDistanceLabel = \$derived/);
    assert.match(app, /getDistanceKm\(userLocation\.lat,\s*userLocation\.lon,\s*selectedMapPlace\.lat,\s*selectedMapPlace\.lon\)/);
    assert.match(app, /\[selectedMapPlaceDistanceLabel,\s*selectedMapPlace\.ratingLabel\]\.filter\(Boolean\)\.join\(' · '\)/);
});

test('selected map place card exposes source links when available', () => {
    assert.match(app, /function getSelectedMapPlaceLinks\(place = selectedMapPlace\)/);
    assert.match(app, /place\?\.source_url/);
    assert.match(app, /place\?\.coordinate_source_url/);
    assert.match(app, /class="selected-map-place-links"/);
    assert.match(app, /href=\{link\.url\}/);
});

test('selected map place card has a share link button', () => {
    assert.match(app, /class="selected-map-place-share"/);
    assert.match(app, /aria-label="Share \{selectedMapPlace\.name\}"/);
    assert.match(app, /onclick=\{\(\) => shareCurrentLocation\(\)\}/);
});

test('selected beach remains visible on the map even when filters exclude it', () => {
    assert.match(app, /const mapRecommendations = \$derived/);
    assert.match(app, /visibleRecommendations\.some\(\(item\) => item\.beach\.name === selectedRecommendation\?\.beach\.name\)/);
    assert.match(app, /recommendations=\{\$state\.snapshot\(mapRecommendations\)\}/);
});

test('explicit beach selection switches recommendation panel into beach view mode', () => {
    assert.match(app, /function clearSelectedBeach\(\)/);
    assert.match(app, /selectedBeachName = ''/);
    assert.match(app, /function clearSelectedBeach\(\) \{[\s\S]*selectedBeachName = '';[\s\S]*panelMode = 'closed';[\s\S]*\}/);
    assert.match(app, /const isBeachView = \$derived\(Boolean\(selectedBeachName && selectedRecommendation\)\)/);
    assert.match(app, /recommendations\.find\(\(item\) => item\.beach\.name === selectedBeachName\) \|\| null/);
    assert.doesNotMatch(app, /recommendations\.find\(\(item\) => item\.beach\.name === selectedBeachName\) \|\| recommendations\[0\] \|\| null/);
    assert.match(app, /isBeachView=\{isBeachView\}/);
    assert.match(app, /onCloseBeach=\{clearSelectedBeach\}/);
});

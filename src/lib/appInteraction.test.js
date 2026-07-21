import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../App.svelte', import.meta.url), 'utf8');

test('map beach selection navigates with the expanded panel offset it will open into', () => {
    assert.match(app, /function selectBeach\(name,\s*targetPanelMode = panelMode\)/);
    assert.match(app, /getBeachSelectionMapTarget\(beach,\s*targetPanelMode,\s*mapLayout\)/);
    assert.match(app, /selectBeach\(name,\s*'expanded'\)/);
    assert.doesNotMatch(app, /activeTab/);
});

test('map knows when a beach was explicitly selected by the user', () => {
    assert.match(app, /hasExplicitBeachSelection=\{Boolean\(selectedBeachName\)\}/);
});

test('nearby facility and business navigation enables the places layer', () => {
    assert.match(app, /target\.type === 'facility' \|\| target\.type === 'business'/);
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
    assert.match(app, /selectBeach\(name,\s*'expanded'\)/);
    assert.match(app, /panelOpenRequest \+= 1/);
});

test('map and search beach selections request the panel detail scroll', () => {
    assert.match(app, /let panelScrollRequest = \$state\(0\)/);
    assert.match(app, /function revealBeachInPanel\(name\)/);
    assert.match(app, /panelOpenRequest \+= 1;\s+panelScrollRequest \+= 1;/);
    assert.match(app, /onSelectBeach=\{revealBeachInPanel\}/);
    assert.match(app, /\{panelScrollRequest\}/);
});

test('selected beach remains visible on the map even when filters exclude it', () => {
    assert.match(app, /const mapRecommendations = \$derived/);
    assert.match(app, /visibleRecommendations\.some\(\(item\) => item\.beach\.name === selectedRecommendation\?\.beach\.name\)/);
    assert.match(app, /recommendations=\{\$state\.snapshot\(mapRecommendations\)\}/);
});

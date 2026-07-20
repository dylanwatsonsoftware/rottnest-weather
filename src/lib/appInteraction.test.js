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

test('recommendation rows describe the selected status window instead of repeating score summaries', () => {
    const panel = readFileSync(new URL('./RecommendationPanel.svelte', import.meta.url), 'utf8');

    assert.match(panel, /getStatusWindowSummary/);
    assert.match(panel, /getRecommendationWindowSummary\(item\)/);
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

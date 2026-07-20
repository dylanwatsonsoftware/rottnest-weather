import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../App.svelte', import.meta.url), 'utf8');

test('map beach selection navigates with the expanded panel offset it will open into', () => {
    assert.match(app, /function selectBeach\(name,\s*targetPanelMode = panelMode\)/);
    assert.match(app, /getBeachSelectionMapTarget\(beach,\s*targetPanelMode,\s*mapLayout\)/);
    assert.match(app, /selectBeach\(name,\s*'expanded'\)/);
});

test('map knows when a beach was explicitly selected by the user', () => {
    assert.match(app, /hasExplicitBeachSelection=\{Boolean\(selectedBeachName\)\}/);
});

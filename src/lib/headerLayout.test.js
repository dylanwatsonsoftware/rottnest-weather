import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('./Header.svelte', import.meta.url), 'utf8');
const recommendationPanel = readFileSync(new URL('./RecommendationPanel.svelte', import.meta.url), 'utf8');

function getMobileHeaderRule() {
    const mediaStart = css.indexOf('@media (max-width: 620px)');
    assert.notEqual(mediaStart, -1);

    const headerStart = css.indexOf('header {', mediaStart);
    assert.notEqual(headerStart, -1);

    const headerEnd = css.indexOf('}', headerStart);
    assert.notEqual(headerEnd, -1);

    return css.slice(headerStart, headerEnd);
}

test('mobile header uses content height instead of fixed extra vertical space', () => {
    const mobileHeaderRule = getMobileHeaderRule();

    assert.match(mobileHeaderRule, /min-height:\s*auto/);
    assert.doesNotMatch(mobileHeaderRule, /min-height:\s*74px/);
});

test('leaflet map controls sit below the fixed top pane', () => {
    assert.match(css, /\.leaflet-top\.leaflet-left\s*{/);
    assert.match(css, /top:\s*calc\(var\(--header-offset\)\s*\+\s*8px\)/);
});

test('beach detail timeline has its own time slider styling', () => {
    assert.match(css, /\.detail-time-control\s*{/);
    assert.match(css, /\.detail-time-control input\[type="range"\]/);
});

test('active status timeline cell has a clear selected border', () => {
    assert.match(css, /\.timeline-cell\.active\s*{[^}]*border:\s*3px solid white/s);
});

test('recommendation row subtitles stay readable on colored cards', () => {
    assert.match(css, /\.recommendation-row\.(best|good|watch|avoid) \.row-main small\s*{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
});

test('forecast range toggle supports four compact options', () => {
    assert.match(css, /\.range-mode-toggle\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
});

test('collapsed tray leaves clearance below the forecast slider thumb', () => {
    assert.match(css, /\.collapsed-time-control\s*{[^}]*padding:\s*0 16px 24px/s);
});

test('selected beach detail can show a horizontally scrollable local photo strip', () => {
    assert.match(recommendationPanel, /getBeachImages/);
    assert.match(recommendationPanel, /\{#key selectedRecommendation\.beach\.name\}/);
    assert.match(recommendationPanel, /class="beach-photo-strip"/);
    assert.match(recommendationPanel, /\{#each selectedBeachImages as image \(image\.src\)\}/);
    assert.match(recommendationPanel, /loading="lazy"/);
    assert.match(css, /\.beach-photo-strip\s*{[^}]*overflow-x:\s*auto/s);
    assert.match(css, /\.beach-photo-strip img\s*{[^}]*aspect-ratio:\s*4 \/ 3/s);
});

test('top beach in the header is selectable', () => {
    assert.match(header, /class="top-beach-button"/);
    assert.match(header, /aria-label="Show \{topRecommendation\.beach\.name\}"/);
});

test('short landscape panel uses available height without forcing desktop width', () => {
    const mediaStart = css.indexOf('@media (max-height: 430px) and (orientation: landscape)');
    assert.notEqual(mediaStart, -1);
    const desktopStart = css.indexOf('@media (min-width: 900px)', mediaStart);
    const landscapeCss = css.slice(mediaStart, desktopStart);

    assert.match(landscapeCss, /height:\s*calc\(100dvh - var\(--header-offset\)\)/);
    assert.match(landscapeCss, /min-height:\s*0/);
    assert.match(landscapeCss, /min-width:\s*min\(360px,\s*58vw\)/);
    assert.match(css, /@media \(min-width: 900px\) and \(min-height: 431px\)/);
});

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

test('collapsed recommendation toggle shows a compact count badge', () => {
    assert.match(recommendationPanel, /class="panel-toggle-title"/);
    assert.match(recommendationPanel, /class="recommendation-count-badge"/);
    assert.match(recommendationPanel, /\{listedRecommendations\.length\}/);
    assert.match(css, /\.recommendation-count-badge\s*{[^}]*border-radius:\s*999px/s);
    assert.match(css, /\.recommendation-count-badge\s*{[^}]*min-width:\s*28px/s);
});

test('expanded panel shows compact forecast controls near the top', () => {
    assert.match(recommendationPanel, /class="expanded-time-control"/);
    assert.match(recommendationPanel, /id="expanded-time-slider"/);
    assert.match(recommendationPanel, /for="expanded-time-slider">\{selectedTime\}/);
    assert.match(recommendationPanel, /class="range-mode-toggle" aria-label="Expanded forecast range"/);
    assert.match(css, /\.expanded-time-control\s*{[^}]*padding:\s*0 12px 10px/s);
    assert.match(css, /\.expanded-time-control input\[type="range"\]\s*{[^}]*background:\s*var\(--slider-heat,\s*#dbe5e5\)/s);
});

test('best beach row selection scrolls the detail card into view', () => {
    assert.match(recommendationPanel, /import \{ tick \} from 'svelte'/);
    assert.match(recommendationPanel, /let beachDetailElement = \$state\(null\)/);
    assert.match(recommendationPanel, /function selectRecommendationRow\(beachName\)/);
    assert.match(recommendationPanel, /onSelectBeach\(beachName\)/);
    assert.match(recommendationPanel, /await tick\(\)/);
    assert.match(recommendationPanel, /beachDetailElement\?\.scrollIntoView\(\{[\s\S]*block:\s*'start'/);
    assert.match(recommendationPanel, /onclick=\{\(\) => selectRecommendationRow\(item\.beach\.name\)\}/);
    assert.match(recommendationPanel, /bind:this=\{beachDetailElement\}/);
});

test('nearby panel places are limited to within one kilometre', () => {
    assert.match(recommendationPanel, /const NEARBY_RADIUS_KM = 1/);
    assert.match(recommendationPanel, /getNearbyFacilities\(beach,\s*allFacilities,\s*5,\s*NEARBY_RADIUS_KM\)/);
    assert.match(recommendationPanel, /\.filter\(\(place\) => place\.distanceKm <= NEARBY_RADIUS_KM\)/);
});

test('selected beach detail can show a horizontally scrollable local photo strip', () => {
    assert.match(recommendationPanel, /getBeachImages/);
    assert.match(recommendationPanel, /\{#key selectedRecommendation\.beach\.name\}/);
    assert.match(recommendationPanel, /class="beach-photo-strip"/);
    assert.match(recommendationPanel, /\{#each selectedBeachImages as image \(image\.src\)\}/);
    assert.match(recommendationPanel, /class="beach-photo-button"/);
    assert.match(recommendationPanel, /loading="lazy"/);
    assert.match(css, /\.beach-photo-strip\s*{[^}]*overflow-x:\s*auto/s);
    assert.match(css, /\.beach-photo-strip img\s*{[^}]*aspect-ratio:\s*4 \/ 3/s);
});

test('beach photos can open in a larger modal view', () => {
    assert.match(recommendationPanel, /let selectedPhoto = \$state\(null\)/);
    assert.match(recommendationPanel, /onclick=\{\(\) => selectedPhoto = image\}/);
    assert.match(recommendationPanel, /role="dialog"/);
    assert.match(recommendationPanel, /class="beach-photo-modal"/);
    assert.match(recommendationPanel, /class="beach-photo-modal-close"/);
    assert.match(css, /\.beach-photo-modal\s*{[^}]*position:\s*fixed/s);
    assert.match(css, /\.beach-photo-modal\s*{[^}]*place-items:\s*end center/s);
    assert.match(css, /\.beach-photo-modal-content\s*{[^}]*background:\s*#061b20/s);
    assert.match(css, /\.beach-photo-modal-image\s*{[^}]*max-height:\s*min\(68dvh,\s*720px\)/s);
    assert.match(css, /\.beach-photo-modal-close\s*{[^}]*order:\s*3/s);
});

test('recommendation panel has one selected-time list with better-time and settings controls', () => {
    assert.match(recommendationPanel, /getRecommendationHeading/);
    assert.match(recommendationPanel, /class="panel-toolbar"/);
    assert.match(recommendationPanel, /class="better-time-button"/);
    assert.match(recommendationPanel, /Find better time/);
    assert.match(recommendationPanel, /aria-label="Open recommendation settings"/);
    assert.match(recommendationPanel, /class="settings-icon-button"/);
    assert.doesNotMatch(recommendationPanel, /Good Later/);
    assert.doesNotMatch(recommendationPanel, /class="panel-tabs"/);
    assert.doesNotMatch(recommendationPanel, /activeTab/);
});

test('settings are shown in a dialog instead of a tab', () => {
    assert.match(recommendationPanel, /let settingsOpen = \$state\(false\)/);
    assert.match(recommendationPanel, /class="settings-modal"/);
    assert.match(recommendationPanel, /role="dialog"/);
    assert.match(recommendationPanel, /Recommendation settings/);
    assert.match(css, /\.settings-modal\s*{[^}]*position:\s*fixed/s);
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

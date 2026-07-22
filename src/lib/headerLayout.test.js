import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('./Header.svelte', import.meta.url), 'utf8');
const app = readFileSync(new URL('../App.svelte', import.meta.url), 'utf8');
const logo = readFileSync(new URL('./Logo.svelte', import.meta.url), 'utf8');
const mapSearch = readFileSync(new URL('./MapSearch.svelte', import.meta.url), 'utf8');
const recommendationPanel = readFileSync(new URL('./RecommendationPanel.svelte', import.meta.url), 'utf8');
const controls = readFileSync(new URL('./Controls.svelte', import.meta.url), 'utf8');
const favicon = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8');

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

test('navbar uses compact Rottnest title', () => {
    assert.match(header, /<h1>Rottnest(?: Weather)?<\/h1>/);
    assert.doesNotMatch(header, /<h1>Rottnest Snorkelling<\/h1>/);
});

test('header and forecast chart expose hourly rainfall', () => {
    assert.match(header, /rainAmount/);
    assert.match(header, /<strong>Rain:<\/strong>/);
    assert.match(controls, /label:\s*'Rainfall \(mm\)'/);
    assert.match(controls, /forecastData\.precipitation/);
    assert.match(recommendationPanel, /conditions\.precipitation[^}]*\}\s*mm rain/);
});

test('app icon uses a stylised Rottnest outline in the header and favicon', () => {
    assert.match(header, /<Logo size=\{40\} class="header-logo" \/>/);
    assert.match(logo, /aria-label="Stylised Rottnest Island outline"/);
    assert.match(logo, /width=\{size\}/);
    assert.match(logo, /height=\{size\}/);
    assert.match(logo, /viewBox="0 0 250 250"/);
    assert.match(logo, /class="rottnest-logo-badge"/);
    assert.match(logo, /class="rottnest-logo-badge"[\s\S]*M 45,139/);
    assert.match(logo, /class="rottnest-logo-shadow"/);
    assert.match(logo, /class="rottnest-silhouette"/);
    assert.match(logo, /d="\s*M 32,168/);
    assert.match(logo, /C 398,50 415,62 430,72/);
    assert.doesNotMatch(logo, /class="rottnest-reef"/);
    assert.doesNotMatch(logo, /class="rottnest-lake"/);
    assert.doesNotMatch(logo, /class="rottnest-location"/);
    assert.doesNotMatch(logo, /Snorkel Mask/);

    assert.match(favicon, /viewBox="0 0 256 256"/);
    assert.match(favicon, /id="favicon-rounded-square"/);
    assert.match(favicon, /rx="56"/);
    assert.match(favicon, /id="favicon-shadow"/);
    assert.match(favicon, /id="favicon-logo-arc"/);
    assert.match(favicon, /id="favicon-logo-arc"[\s\S]*M 45,139/);
    assert.match(favicon, /id="favicon-logo-arc-highlight"/);
    assert.match(favicon, /id="rottnest-silhouette"/);
    assert.match(favicon, /d="\s*M 32,168/);
    assert.match(favicon, /C 398,50 415,62 430,72/);
    assert.doesNotMatch(favicon, /viewBox="0 0 500 250"/);
    assert.doesNotMatch(favicon, /id="rottnest-reef"/);
    assert.doesNotMatch(favicon, /id="rottnest-lake"/);
    assert.doesNotMatch(favicon, /id="rottnest-location"/);
    assert.doesNotMatch(favicon, /Snorkel Mask/);
});

test('leaflet map controls sit below the fixed top pane', () => {
    assert.match(css, /\.leaflet-top\.leaflet-left\s*{/);
    assert.match(css, /top:\s*calc\(var\(--header-offset\)\s*\+\s*8px\)/);
});

test('route and pin controls are icon buttons below the map zoom controls', () => {
    assert.match(app, /aria-label="Start route planning"/);
    assert.match(app, /aria-label="Drop a pin"/);
    assert.match(app, /<span class="route-planner-icon route-planner-icon-route" aria-hidden="true">/);
    assert.match(app, /<span class="route-planner-icon route-planner-icon-pin" aria-hidden="true">⌖<\/span>/);
    assert.doesNotMatch(app, /<span class="route-planner-icon" aria-hidden="true">↝<\/span>/);
    assert.doesNotMatch(app, />\s*Route\s*<\/button>/);
    assert.doesNotMatch(app, />\s*Pin\s*<\/button>/);
    assert.match(css, /\.route-planner\s*{[^}]*top:\s*calc\(var\(--header-offset\)\s*\+\s*92px\)/s);
    assert.match(css, /\.route-planner\s*{[^}]*right:\s*var\(--map-control-right\)/s);
    assert.doesNotMatch(css, /\.route-planner\s*{[^}]*left:\s*14px/s);
    assert.match(css, /\.route-planner-actions\s*{[^}]*padding:\s*3px/s);
    assert.match(css, /\.route-planner-actions button\s*{[^}]*width:\s*32px/s);
    assert.match(css, /\.route-planner-actions button\s*{[^}]*height:\s*32px/s);
    assert.match(css, /\.route-planner-actions\s*{[^}]*display:\s*grid/s);
    assert.match(css, /\.route-planner-card\s*{[^}]*width:\s*max-content/s);
    assert.match(css, /\.route-planner-card\s*{[^}]*max-width:\s*min\(190px,\s*calc\(100vw - 110px\)\)/s);
    assert.match(css, /\.route-planner-actions button:hover/s);
    assert.match(css, /\.route-planner-actions button:focus-visible/s);
    assert.match(css, /\.route-planner-card button:not\(:disabled\):hover/s);
    assert.match(css, /\.route-planner-card\s*{[^}]*pointer-events:\s*auto/s);
    assert.doesNotMatch(css, /\.route-planner-card\s*{[^}]*pointer-events:\s*none/s);
    assert.match(css, /\.route-planner-card a:hover/s);
    assert.match(css, /\.route-name-field input[\s\S]*pointer-events:\s*auto/);
});

test('app buttons have subtle hover and focus feedback outside map planning controls', () => {
    assert.match(css, /\.range-mode-toggle button:not\(\.active\):hover/s);
    assert.match(css, /\.collapsed-better-time-button:hover/s);
    assert.match(css, /\.better-time-button:hover/s);
    assert.match(css, /\.settings-icon-button:hover/s);
    assert.match(css, /\.recommendation-row:hover/s);
    assert.match(css, /\.nearby-list button:hover/s);
    assert.match(css, /\.map-jump-button:hover/s);
    assert.match(css, /\.beach-share-button:hover/s);
    assert.match(css, /\.selected-map-place-close:hover/s);
    assert.match(css, /\.beach-photo-button:hover/s);
    assert.match(css, /\.beach-photo-modal-close:hover/s);
    assert.match(css, /\.settings-sheet-header button:hover/s);
    assert.match(css, /\.range-mode-toggle button:focus-visible/s);
    assert.match(css, /\.recommendation-row:focus-visible/s);
    assert.match(css, /\.nearby-list button:focus-visible/s);
});

test('floating map search is a compact icon until opened', () => {
    assert.match(mapSearch, /class="map-search"/);
    assert.match(mapSearch, /class:open=\{isOpen\}/);
    assert.match(mapSearch, /const searchOrigin = \$derived\(userLocation \|\| localSearchLocation\)/);
    assert.match(mapSearch, /searchPlaces\(searchIndex,\s*query,\s*8,\s*searchOrigin\)/);
    assert.match(mapSearch, /import \{ onMount,\s*tick \} from 'svelte'/);
    assert.match(mapSearch, /onMount\(\(\) => \{[\s\S]*requestSearchLocation\(\)/);
    assert.match(mapSearch, /function requestSearchLocation\(\)/);
    assert.match(mapSearch, /navigator\.geolocation\.getCurrentPosition/);
    assert.match(mapSearch, /function getResultMeta\(result\)/);
    assert.match(mapSearch, /\[result\.label,\s*result\.distanceLabel,\s*result\.ratingLabel\]\.filter\(Boolean\)\.join\(' · '\)/);
    assert.match(mapSearch, /aria-label="Open map search"/);
    assert.match(mapSearch, /class="map-search-toggle"/);
    assert.match(mapSearch, /type="text"/);
    assert.match(mapSearch, /inputmode="search"/);
    assert.doesNotMatch(mapSearch, /type="search"/);
    assert.match(mapSearch, /placeholder="Search beaches or places"/);
    assert.match(css, /\.map-search\s*{[^}]*top:\s*calc\(var\(--header-offset\)\s*\+\s*8px\)/s);
    assert.match(css, /--map-control-right:\s*14px/);
    assert.match(css, /\.map-search\s*{[^}]*right:\s*var\(--map-control-right\)/s);
    assert.match(css, /\.map-search\s*{[^}]*width:\s*42px/s);
    assert.match(css, /\.map-search\.open\s*{[^}]*width:\s*min\(420px,\s*calc\(100vw - 110px\)\)/s);
    assert.match(css, /@media \(max-width: 620px\)[\s\S]*\.map-search\.open\s*{[^}]*width:\s*calc\(100vw - 98px\)/s);
});

test('selected nearby map places have an obvious marker and label', () => {
    assert.match(css, /\.landmark-icon\.selected\s*{[^}]*border:\s*3px solid white/s);
    assert.match(css, /\.landmark-icon\.selected\s*{[^}]*box-shadow:[^}]*0 0 0 4px #0b7583/s);
    assert.match(css, /\.landmark-icon span\s*{[^}]*pointer-events:\s*none/s);
    assert.match(css, /\.place-label\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.96\)/s);
    assert.match(css, /\.place-label\.selected\s*{[^}]*border-color:\s*#0b7583/s);
});

test('selected map place card keeps content visible beside the close button', () => {
    assert.match(css, /\.selected-map-place-card\s*{[^}]*grid-template-columns:\s*38px minmax\(0,\s*1fr\)/s);
    assert.match(css, /\.selected-map-place-close\s*{[^}]*grid-column:\s*1/s);
    assert.match(css, /\.selected-map-place-content\s*{[^}]*grid-column:\s*2/s);
    assert.match(css, /\.selected-map-place-card\.has-images\s*{[^}]*grid-template-columns:\s*38px minmax\(0,\s*104px\) minmax\(0,\s*1fr\)/s);
    assert.match(css, /\.selected-map-place-image-strip\s*{[^}]*overflow-x:\s*auto/s);
    assert.match(css, /\.selected-map-place-rating\s*{[^}]*background:\s*#e6f3f1/s);
});

test('ranked beach marker size classes are visually distinct', () => {
    const markerStart = css.indexOf('.beach-marker {');
    assert.notEqual(markerStart, -1);
    const markerEnd = css.indexOf('}', markerStart);
    const markerRule = css.slice(markerStart, markerEnd);

    assert.doesNotMatch(markerRule, /width:\s*34px\s*!important/);
    assert.doesNotMatch(markerRule, /height:\s*34px\s*!important/);
    assert.match(markerRule, /width:\s*var\(--beach-marker-size\)\s*!important/);
    assert.match(css, /\.beach-marker\.prominent\s*{[^}]*--beach-marker-size:\s*38px/s);
    assert.match(css, /\.beach-marker\.small\s*{[^}]*--beach-marker-size:\s*28px/s);
    assert.match(css, /\.beach-marker\.compact\s*{[^}]*--beach-marker-size:\s*24px/s);
    assert.match(css, /\.beach-marker\.tiny\s*{[^}]*--beach-marker-size:\s*22px/s);
    assert.match(css, /\.beach-marker\.selected\s*{[^}]*--beach-marker-size:\s*40px/s);
    assert.match(css, /\.beach-marker\.compact small\s*{[^}]*transform:\s*scale\(0\.82\)/s);
    assert.match(css, /\.beach-marker\.tiny small\s*{[^}]*transform:\s*scale\(0\.72\)/s);
});

test('circular map glyphs are explicitly centered', () => {
    assert.match(css, /\.beach-marker span\s*{[^}]*display:\s*grid/s);
    assert.match(css, /\.beach-marker span\s*{[^}]*place-items:\s*center/s);
    assert.match(css, /\.beach-marker span\s*{[^}]*line-height:\s*1/s);
    assert.match(css, /\.selected-map-place-close\s*{[^}]*display:\s*grid/s);
    assert.match(css, /\.selected-map-place-close\s*{[^}]*place-items:\s*center/s);
    assert.match(css, /\.selected-map-place-close\s*{[^}]*padding:\s*0/s);
    assert.match(css, /\.beach-panel-close\s*{[^}]*display:\s*grid/s);
    assert.match(css, /\.beach-panel-close\s*{[^}]*place-items:\s*center/s);
    assert.match(css, /\.beach-panel-close\s*{[^}]*padding:\s*0/s);
    assert.match(css, /\.dropped-pin-close\s*{[^}]*display:\s*grid/s);
    assert.match(css, /\.dropped-pin-close\s*{[^}]*place-items:\s*center/s);
    assert.match(css, /\.dropped-pin-close\s*{[^}]*padding:\s*0/s);
});

test('beach detail timeline has its own time slider styling', () => {
    assert.match(css, /\.detail-time-control\s*{/);
    assert.match(css, /\.detail-time-control input\[type="range"\]/);
    assert.match(recommendationPanel, /const beachDetailHeatGradient = \$derived\(getSliderHeatGradient\(beachTimeline,\s*forecastRange\)\)/);
    assert.match(recommendationPanel, /id="detail-time-slider"[\s\S]*style:--slider-heat=\{beachDetailHeatGradient\}/);
    assert.doesNotMatch(recommendationPanel, />Score by time</);
});

test('beach detail uses only the forecast slider for time selection', () => {
    assert.match(recommendationPanel, /id="detail-time-slider"/);
    assert.doesNotMatch(recommendationPanel, /class="timeline-chart"/);
    assert.doesNotMatch(recommendationPanel, /class="timeline-cell/);
});

test('forecast graph does not render a duplicate slider directly above it', () => {
    assert.match(controls, /class="graph-container"/);
    assert.doesNotMatch(controls, /class="slider-container"[\s\S]*class="graph-container"/);
});

test('recommendation row subtitles stay readable on colored cards', () => {
    assert.match(css, /\.recommendation-row\.best \.row-main strong,[\s\S]*\.recommendation-row\.avoid \.row-main strong\s*{[^}]*color:\s*white/s);
    assert.match(css, /\.recommendation-row\.(best|good|watch|avoid) \.row-main small\s*{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.78\)/s);
});

test('forecast range toggle supports four compact options', () => {
    assert.match(css, /\.range-mode-toggle\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
});

test('forecast range expands before clamping deep-linked selected times', () => {
    assert.match(recommendationPanel, /getRangeModeForHourIndex/);
    assert.match(recommendationPanel, /const nextRangeMode = getRangeModeForHourIndex\(forecastData,\s*hourIndex\)/);
    assert.match(recommendationPanel, /hourIndex < range\.min \|\| hourIndex > range\.max/);
    assert.match(recommendationPanel, /rangeMode = nextRangeMode/);
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

test('fully closed recommendation panel hides body content and stays compact', () => {
    assert.match(css, /\.recommendation-panel\.closed\s*{[^}]*max-height:\s*62px/s);
    assert.match(css, /\.recommendation-panel\.closed\s*{[^}]*min-height:\s*62px/s);
    assert.match(css, /\.recommendation-panel\.closed\s*{[^}]*bottom:\s*0/s);
    assert.match(css, /\.recommendation-panel\.closed\s*{[^}]*overflow:\s*hidden/s);
    assert.match(css, /\.recommendation-panel\.closed\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.94\)/s);
    assert.match(css, /\.recommendation-panel\.closed\s*{[^}]*box-shadow:\s*0 -10px 28px rgba\(13,\s*34,\s*38,\s*0\.2\)/s);
    assert.match(css, /\.recommendation-panel\.closed \.panel-body\s*{[^}]*display:\s*none/s);
    assert.match(css, /\.recommendation-panel\.closed \.panel-collapse-toggle\s*{[^}]*min-height:\s*46px/s);
    assert.match(css, /\.recommendation-panel\.closed \.panel-collapse-toggle\s*{[^}]*padding:\s*5px 12px 20px/s);
});

test('recommendation panel supports swipe gestures between panel states', () => {
    assert.match(recommendationPanel, /getPanelModeFromSwipe/);
    assert.match(recommendationPanel, /function handlePanelTouchStart\(event\)/);
    assert.match(recommendationPanel, /function handlePanelTouchEnd\(event\)/);
    assert.match(recommendationPanel, /ontouchstart=\{handlePanelTouchStart\}/);
    assert.match(recommendationPanel, /ontouchend=\{handlePanelTouchEnd\}/);
});

test('expanded recommendation toggle uses a clear hide label', () => {
    assert.match(recommendationPanel, /Hide recommendations/);
    assert.doesNotMatch(recommendationPanel, /Map view/);
});

test('expanded panel shows compact forecast controls near the top', () => {
    assert.match(recommendationPanel, /class="expanded-time-control"/);
    assert.match(recommendationPanel, /id="expanded-time-slider"/);
    assert.match(recommendationPanel, /for="expanded-time-slider">\{selectedTime\}/);
    assert.match(recommendationPanel, /class="range-mode-toggle" aria-label="Expanded forecast range"/);
    assert.match(css, /\.expanded-time-control\s*{[^}]*padding:\s*0 12px 10px/s);
    assert.match(css, /\.expanded-time-control input\[type="range"\],[\s\S]*\{[^}]*background:\s*var\(--slider-heat,\s*#dbe5e5\)/);
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

test('external beach selections scroll the selected panel detail into view', () => {
    assert.match(recommendationPanel, /panelScrollRequest = 0/);
    assert.match(recommendationPanel, /let lastHandledScrollRequest = \$state\(0\)/);
    assert.match(recommendationPanel, /function scrollBeachDetailIntoView\(\)/);
    assert.match(recommendationPanel, /requestAnimationFrame\(scrollBeachDetailIntoView\)/);
    assert.match(recommendationPanel, /lastHandledScrollRequest = panelScrollRequest/);
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

test('nearby landmarks and food venues can show bundled place photos', () => {
    assert.match(recommendationPanel, /getPlaceImages/);
    assert.match(recommendationPanel, /getPrimaryPlaceImage\(place\)/);
    assert.match(recommendationPanel, /class="nearby-place-thumbnail"/);
    assert.match(recommendationPanel, /alt=\{placeImage\.alt\}/);
    assert.match(css, /\.nearby-place-thumbnail\s*{[^}]*aspect-ratio:\s*4 \/ 3/s);
});

test('beach and nearby details expose source links when bundled data has them', () => {
    assert.match(recommendationPanel, /function getSourceLinks\(place = \{\}\)/);
    assert.match(recommendationPanel, /place\.guide_sources/);
    assert.match(recommendationPanel, /class="source-links"/);
    assert.match(recommendationPanel, /href=\{link\.url\}/);
    assert.match(recommendationPanel, /Official guide/);
    assert.match(recommendationPanel, /Source/);
    assert.match(css, /\.source-links\s*{/);
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

test('selected beach mode uses a dedicated beach panel instead of recommendation chrome', () => {
    const beachPanelStart = recommendationPanel.indexOf('id="beach-panel-content"');
    const beachPanelEnd = recommendationPanel.indexOf('{:else}', beachPanelStart);
    const beachPanelSource = recommendationPanel.slice(beachPanelStart, beachPanelEnd);

    assert.notEqual(beachPanelStart, -1);
    assert.notEqual(beachPanelEnd, -1);
    assert.match(recommendationPanel, /isBeachView = false/);
    assert.match(recommendationPanel, /shareUrl = ''/);
    assert.match(recommendationPanel, /onShareLocation = \(\) => \{\}/);
    assert.match(recommendationPanel, /shareSucceeded = false/);
    assert.match(recommendationPanel, /onCloseBeach = \(\) => \{\}/);
    assert.match(recommendationPanel, /class:beach-mode=\{isBeachView\}/);
    assert.match(recommendationPanel, /\{#if isBeachView && selectedRecommendation\}/);
    assert.match(recommendationPanel, /class="beach-panel-header"/);
    assert.match(recommendationPanel, /class="beach-panel-handle"/);
    assert.match(recommendationPanel, /\{#if isClosed\}[\s\S]*<small>\{selectedTime\}<\/small>/);
    assert.match(recommendationPanel, /class="beach-panel-close"/);
    assert.match(recommendationPanel, /aria-label="Close beach view"/);
    assert.match(recommendationPanel, /onclick=\{onCloseBeach\}/);
    assert.match(recommendationPanel, /id="beach-mode-time-slider"/);
    assert.match(recommendationPanel, /id="beach-mode-semi-time-slider"/);
    assert.match(recommendationPanel, /class="beach-share-button"/);
    assert.match(recommendationPanel, /class:copied=\{shareSucceeded\}/);
    assert.match(recommendationPanel, /aria-label="Share \{selectedRecommendation\.beach\.name\}"/);
    assert.match(recommendationPanel, /onclick=\{\(\) => onShareLocation\(\)\}/);
    assert.match(recommendationPanel, /\{shareSucceeded \? '✓' : '🔗'\}/);
    assert.match(beachPanelSource, /class="panel-content"[\s\S]*class="detail-metrics"[\s\S]*\{#if isOpen && safetyNotices\.length\}[\s\S]*class="safety-strip"/);
    assert.match(beachPanelSource, /<Controls[\s\S]*\{forecastData\}[\s\S]*\{forecastRange\}[\s\S]*rangeMode=\{effectiveRangeMode\}[\s\S]*bind:hourIndex/);
    assert.match(recommendationPanel, /\{:else\}[\s\S]*class="panel-toolbar"/);
    assert.match(css, /\.beach-panel-header\s*{[^}]*padding:\s*7px 10px 4px 12px/s);
    assert.match(css, /\.beach-panel-handle\s*{[^}]*grid-column:\s*1 \/ -1/s);
});

test('nearby list does not expose raw source link chips', () => {
    assert.doesNotMatch(recommendationPanel, /source-links compact/);
    assert.doesNotMatch(recommendationPanel, /aria-label="\{place\.name\} source links"/);
    assert.match(recommendationPanel, /aria-label="\{selectedRecommendation\.beach\.name\} source links"/);
});

test('selected beach distance is shown subtly with condition metrics', () => {
    assert.doesNotMatch(recommendationPanel, /class="detail-distance"/);
    assert.match(recommendationPanel, /class="detail-metrics"[\s\S]*selectedRecommendation\.conditions\.windSpeed[\s\S]*selectedRecommendation\.conditions\.swellHeight[\s\S]*selectedBeachDistanceLabel[\s\S]*class="distance-metric"/);
    assert.match(css, /\.detail-metrics \.distance-metric\s*{[^}]*background:\s*transparent/s);
    assert.match(css, /\.detail-metrics \.distance-metric\s*{[^}]*color:\s*#5d6d6f/s);
});

test('recommendation panel labels watch-state recommendations as caution', () => {
    assert.match(recommendationPanel, /watch:\s*'Caution'/);
    assert.doesNotMatch(recommendationPanel, /watch:\s*'Watch'/);
});

test('recommendation rows show a status heatbar instead of window summary text', () => {
    assert.match(recommendationPanel, /getRecommendationHeatbar\(item\)/);
    assert.match(recommendationPanel, /<span class="score">\{item\.score\}<\/span>/);
    assert.doesNotMatch(recommendationPanel, /\{#if shouldShowRecommendationScore\(item\)\}[\s\S]*class="score"/);
    assert.match(recommendationPanel, /class="recommendation-heatbar"/);
    assert.match(recommendationPanel, /class="recommendation-heatbar-marker"/);
    assert.doesNotMatch(recommendationPanel, /<small>\{getRecommendationWindowSummary\(item\)\}<\/small>/);
    assert.match(css, /\.recommendation-heatbar\s*{[^}]*background:\s*var\(--recommendation-heat,/s);
    assert.match(css, /\.recommendation-heatbar-marker\s*{[^}]*left:\s*var\(--recommendation-progress,\s*0%\)/s);
});

test('next good window hints are visually highlighted in beach details', () => {
    assert.match(recommendationPanel, /class="next-good-window"/);
    assert.doesNotMatch(recommendationPanel, /<p class="detail-note">Next good window:/);
    assert.match(recommendationPanel, /<button[\s\S]*class="next-good-window"[\s\S]*onclick=\{\(\) => jumpToNextGoodWindow\(selectedRecommendation\.nextGood\)\}/);
    assert.match(recommendationPanel, /\{formatNextGoodDuration\(selectedRecommendation\.nextGood\)\}/);
    assert.match(recommendationPanel, /class="next-good-window"[\s\S]*class="detail-metrics"/);
    assert.match(css, /\.next-good-window\s*{[^}]*background:\s*#eef7f6/s);
    assert.match(css, /\.next-good-window\s*{[^}]*border:\s*1px solid #cfe0e0/s);
    assert.match(css, /\.next-good-window span\s*{[^}]*font-weight:\s*800/s);
    assert.match(css, /\.next-good-window\s*{[^}]*cursor:\s*pointer/s);
    assert.doesNotMatch(css, /\.next-good-window span\s*{[^}]*text-transform:\s*uppercase/s);
});

test('settings are shown in a dialog instead of a tab', () => {
    assert.match(recommendationPanel, /let settingsOpen = \$state\(false\)/);
    assert.match(recommendationPanel, /class="settings-modal"/);
    assert.match(recommendationPanel, /role="dialog"/);
    assert.match(recommendationPanel, /Recommendation settings/);
    assert.match(css, /\.settings-modal\s*{[^}]*position:\s*fixed/s);
});

test('header shows the selected forecast time instead of a top beach button', () => {
    assert.match(header, /selectedForecastTime = ''/);
    assert.match(header, /class="forecast-time-chip"/);
    assert.match(header, /<strong>Time:<\/strong> \{selectedForecastTime\}/);
    assert.doesNotMatch(header, /topRecommendation/);
    assert.doesNotMatch(header, /class="top-beach-button"/);
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

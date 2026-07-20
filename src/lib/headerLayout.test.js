import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('./Header.svelte', import.meta.url), 'utf8');

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

test('forecast range toggle supports four compact options', () => {
    assert.match(css, /\.range-mode-toggle\s*{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/s);
});

test('collapsed tray leaves clearance below the forecast slider thumb', () => {
    assert.match(css, /\.collapsed-time-control\s*{[^}]*padding:\s*0 16px 24px/s);
});

test('top beach in the header is selectable', () => {
    assert.match(header, /class="top-beach-button"/);
    assert.match(header, /aria-label="Show \{topRecommendation\.beach\.name\}"/);
});

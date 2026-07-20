import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

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

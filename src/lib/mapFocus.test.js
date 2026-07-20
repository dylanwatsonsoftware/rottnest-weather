import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialFitSettings } from './mapFocus.js';

test('focused beach startup avoids over-zooming out on mobile', () => {
    const settings = getInitialFitSettings({ hasBeachFocus: true });

    assert.equal(settings.minZoom, 14);
    assert.ok(settings.fitBoundsOptions.paddingBottomRight[1] <= 140);
});

test('whole-island startup can fit all of Rottnest when no beaches look good', () => {
    const settings = getInitialFitSettings({ hasBeachFocus: false });

    assert.equal(settings.minZoom, null);
    assert.ok(settings.fitBoundsOptions.paddingBottomRight[1] >= 260);
});

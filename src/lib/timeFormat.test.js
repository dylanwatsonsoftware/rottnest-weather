import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCompactTime } from './timeFormat.js';

test('formatCompactTime uses compact 12-hour labels', () => {
    assert.equal(formatCompactTime('2026-07-20T08:00'), '8am');
    assert.equal(formatCompactTime('2026-07-20T15:00'), '3pm');
    assert.equal(formatCompactTime('2026-07-20T12:30'), '12:30pm');
});

test('formatCompactTime can include a short weekday', () => {
    assert.equal(formatCompactTime('2026-07-20T08:00', { weekday: true }), 'Mon 8am');
});

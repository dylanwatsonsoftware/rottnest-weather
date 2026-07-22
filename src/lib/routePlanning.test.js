import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildGoogleMapsCoordinateUrl,
    formatCoordinateLabel,
    getRouteDistanceKm,
    getRouteDistanceLabel
} from './routePlanning.js';

test('getRouteDistanceKm sums waypoint segments', () => {
    const route = [
        { lat: -32.0064, lon: 115.5099 },
        { lat: -32.0101, lon: 115.5152 },
        { lat: -32.0133, lon: 115.5194 }
    ];

    assert.equal(Math.round(getRouteDistanceKm(route) * 10) / 10, 1.2);
    assert.equal(getRouteDistanceKm([{ lat: -32, lon: 115 }]), 0);
});

test('getRouteDistanceLabel formats short and longer planned paths', () => {
    assert.equal(getRouteDistanceLabel(0.42), '420 m');
    assert.equal(getRouteDistanceLabel(2.35), '2.4 km');
});

test('formatCoordinateLabel and buildGoogleMapsCoordinateUrl expose dropped pins clearly', () => {
    const pin = { lat: -32.0064123, lon: 115.5099876 };

    assert.equal(formatCoordinateLabel(pin), '32.00641°S, 115.50999°E');
    assert.equal(buildGoogleMapsCoordinateUrl(pin), 'https://www.google.com/maps?q=-32.00641%2C115.50999&t=k&z=17');
    assert.equal(formatCoordinateLabel(null), '');
    assert.equal(buildGoogleMapsCoordinateUrl(null), '');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
    activateRouteNameInput,
    buildGoogleMapsCoordinateUrl,
    buildGoogleMapsRouteUrl,
    formatCoordinateLabel,
    getRouteDistanceKm,
    getRouteDistanceLabel
} from './routePlanning.js';

test('activateRouteNameInput focuses the field and requests the Android virtual keyboard', () => {
    const calls = [];
    activateRouteNameInput(
        { focus: () => calls.push('focus') },
        { show: () => calls.push('show') }
    );
    assert.deepEqual(calls, ['focus', 'show']);
    assert.doesNotThrow(() => activateRouteNameInput({ focus() {} }, null));
});

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

test('buildGoogleMapsRouteUrl opens waypoint routes in Google Maps walking directions', () => {
    const route = [
        { lat: -32.0064, lon: 115.5099 },
        { lat: -32.0101, lon: 115.5152 },
        { lat: -32.0133, lon: 115.5194 }
    ];

    assert.equal(
        buildGoogleMapsRouteUrl(route),
        'https://www.google.com/maps/dir/?api=1&origin=-32.00640%2C115.50990&destination=-32.01330%2C115.51940&waypoints=-32.01010%2C115.51520&travelmode=walking'
    );
    assert.equal(buildGoogleMapsRouteUrl(route.slice(0, 2)), 'https://www.google.com/maps/dir/?api=1&origin=-32.00640%2C115.50990&destination=-32.01010%2C115.51520&travelmode=walking');
    assert.equal(buildGoogleMapsRouteUrl(route.slice(0, 1)), '');
    assert.equal(buildGoogleMapsRouteUrl([{ lat: Number.NaN, lon: 115 }, route[1]]), '');
});

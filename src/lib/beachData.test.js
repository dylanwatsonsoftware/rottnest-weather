import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const beaches = JSON.parse(readFileSync(new URL('../../public/beaches.json', import.meta.url), 'utf8'));
const NORTH_WIND_GUIDE_BEACHES = [
    'Henrietta Rocks',
    'Parker Point',
    'Salmon Bay',
    'Green Island',
    'Mary Cove',
    'Strickland Bay'
];
const SOUTH_WIND_GUIDE_BEACHES = [
    'Marjorie Bay',
    'Rocky Bay',
    'Stark Bay',
    'Ricey Beach',
    'City of York Bay',
    'Catherine Bay',
    'Little Armstrong Bay',
    'Parakeet Bay',
    'Little Parakeet Bay',
    'Geordie Bay',
    'Fays Bay',
    'Longreach Bay',
    'The Basin',
    'Pinky Beach'
];

function beachNamed(name) {
    const beach = beaches.find((item) => item.name === name);
    assert.ok(beach, `Expected ${name} in beach data`);
    return beach;
}

test('Parker Point follows north-wind guide guidance', () => {
    const parkerPoint = beachNamed('Parker Point');

    assert.ok(parkerPoint.ok_winds.includes('N'));
    assert.ok(parkerPoint.ok_winds.includes('NE'));
    assert.equal(parkerPoint.ok_winds.includes('S'), false);
});

test('guide-backed beaches expose local detail metadata', () => {
    for (const name of [...NORTH_WIND_GUIDE_BEACHES, ...SOUTH_WIND_GUIDE_BEACHES]) {
        const beach = beachNamed(name);

        assert.ok(beach.guide_note);
        assert.ok(beach.activity_tags?.length);
        assert.ok(beach.exposure_note);
        assert.ok(Number.isFinite(beach.lat));
        assert.ok(Number.isFinite(beach.lon));
    }
});

test('official north-wind guide beaches accept northerly winds', () => {
    for (const name of NORTH_WIND_GUIDE_BEACHES) {
        const beach = beachNamed(name);

        assert.ok(beach.ok_winds.includes('N'), `${name} should accept north winds`);
    }
});

test('official south-wind guide beaches accept southerly winds', () => {
    for (const name of SOUTH_WIND_GUIDE_BEACHES) {
        const beach = beachNamed(name);

        assert.ok(beach.ok_winds.includes('S'), `${name} should accept south winds`);
    }
});

test('surf and wildlife-sensitive beaches carry safety tags', () => {
    for (const name of ['Green Island', 'Mary Cove', 'Strickland Bay', 'Stark Bay']) {
        const beach = beachNamed(name);

        assert.ok(beach.safety_tags?.length, `${name} should expose safety tags`);
        assert.ok(beach.caution_notes?.length, `${name} should expose caution notes`);
    }
});

test('problem bay markers use shoreline-focused app coordinates', () => {
    const littleArmstrong = beachNamed('Little Armstrong Bay');
    assert.equal(littleArmstrong.lat, -31.99159);
    assert.equal(littleArmstrong.lon, 115.50578);
    assert.equal(littleArmstrong.coordinate_source, 'wikimedia_commons_geotagged_beach_photo');
    assert.match(littleArmstrong.coordinate_note, /shoreline/i);

    const strickland = beachNamed('Strickland Bay');
    assert.ok(Math.abs(strickland.lat - -32.0189) < 0.0001);
    assert.ok(Math.abs(strickland.lon - 115.4865) < 0.0001);
    assert.equal(strickland.coordinate_source, 'surf_spot_location_checked_against_official_strickland_page');
    assert.match(strickland.coordinate_note, /shoreline|surf/i);
});

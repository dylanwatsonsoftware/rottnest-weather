import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const beaches = JSON.parse(readFileSync(new URL('../../public/beaches.json', import.meta.url), 'utf8'));

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
    for (const name of ['Parker Point', 'Green Island', 'Little Armstrong Bay', 'Geordie Bay', 'The Basin']) {
        const beach = beachNamed(name);

        assert.ok(beach.guide_note);
        assert.ok(beach.activity_tags?.length);
        assert.ok(beach.exposure_note);
    }
});

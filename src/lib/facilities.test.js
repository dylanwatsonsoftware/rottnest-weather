import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    FACILITY_TYPE_LABELS,
    getFacilityIcon,
    getNearbyFacilities,
    mergeFacilityEnrichment
} from './facilities.js';

const beach = { name: 'The Basin', lat: -31.9892, lon: 115.5351 };
const facilityData = JSON.parse(readFileSync(new URL('../../public/facilities.json', import.meta.url), 'utf8'));

test('getNearbyFacilities sorts facilities by distance and only keeps places within 1km', () => {
    const facilities = [
        { id: 'geordie-cafe', name: 'Geordie Cafe', lat: -31.9913, lon: 115.5209, category: 'cafe' },
        { id: 'basin-water', name: 'The Basin Water', lat: -31.98921, lon: 115.53512, category: 'drinking_water' }
    ];

    assert.deepEqual(getNearbyFacilities(beach, facilities, 2), [
        {
            ...facilities[1],
            type: 'facility',
            distanceKm: 0,
            label: 'Water',
            icon: '💧'
        }
    ]);
});

test('mergeFacilityEnrichment keeps ratings optional and keyed by id', () => {
    const facilities = [
        { id: 'geordie-cafe', name: 'Geordie Cafe', category: 'cafe' },
        { id: 'basin-water', name: 'The Basin Water', category: 'drinking_water' }
    ];
    const enrichment = {
        'geordie-cafe': {
            rating: 4.2,
            userRatingCount: 120,
            source: 'manual_google_places_cache'
        }
    };

    assert.deepEqual(mergeFacilityEnrichment(facilities, enrichment), [
        {
            ...facilities[0],
            rating: 4.2,
            userRatingCount: 120,
            source: 'manual_google_places_cache'
        },
        facilities[1]
    ]);
});

test('facility type labels and icons cover food and practical beach facilities', () => {
    assert.equal(FACILITY_TYPE_LABELS.cafe, 'Cafe');
    assert.equal(FACILITY_TYPE_LABELS.toilets, 'Toilets');
    assert.equal(getFacilityIcon('bus_stop'), '🚌');
    assert.equal(getFacilityIcon('unknown'), '📍');
});

test('facility data contains named food venues instead of settlement cafe grouping', () => {
    const facilityNames = facilityData.map((facility) => facility.name);

    assert.ok(facilityNames.includes("Pinky's Rottnest Island"));
    assert.ok(facilityNames.includes('The Lane Cafe'));
    assert.ok(facilityNames.includes('Rottnest Bakery'));
    assert.ok(facilityNames.includes('Dome Cafe'));
    assert.equal(facilityNames.includes('Settlement Cafes'), false);
});

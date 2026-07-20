import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    FACILITY_TYPE_LABELS,
    getFacilityIcon,
    getFacilityRatingLabel,
    getFacilityTypeLabel,
    getNearbyFacilities,
    mergeFacilityEnrichment
} from './facilities.js';

const beach = { name: 'The Basin', lat: -31.9892, lon: 115.5351 };
const facilityData = JSON.parse(readFileSync(new URL('../../public/facilities.json', import.meta.url), 'utf8'));
const placeEnrichment = JSON.parse(readFileSync(new URL('../../public/place-enrichment.json', import.meta.url), 'utf8'));

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

test('getFacilityTypeLabel turns raw facility categories into user-friendly copy', () => {
    assert.equal(getFacilityTypeLabel({ category: 'bicycle_parking' }), 'Bike parking');
    assert.equal(getFacilityTypeLabel({ category: 'drinking_water' }), 'Water');
    assert.equal(getFacilityTypeLabel({ subtype: 'lighthouse' }), 'Lighthouse');
    assert.equal(getFacilityTypeLabel({ category: 'picnic_area' }), 'Picnic area');
});

test('getFacilityRatingLabel formats available ratings with review counts', () => {
    assert.equal(getFacilityRatingLabel({ rating: 4.6, userRatingCount: 2100 }), '4.6 ★ (2.1K)');
    assert.equal(getFacilityRatingLabel({ rating: 4, userRatingCount: 651 }), '4.0 ★ (651)');
    assert.equal(getFacilityRatingLabel({ rating: 3.7 }), '3.7 ★');
    assert.equal(getFacilityRatingLabel({}), '');
});

test('facility data contains named food venues instead of settlement cafe grouping', () => {
    const facilityNames = facilityData.map((facility) => facility.name);

    assert.ok(facilityNames.includes("Pinky's Beach Club"));
    assert.ok(facilityNames.includes('The Lane Cafe'));
    assert.ok(facilityNames.includes('Rottnest Bakery'));
    assert.ok(facilityNames.includes('Dome Cafe'));
    assert.equal(facilityNames.includes('Settlement Cafes'), false);
});

test('place enrichment includes static Google ratings when available', () => {
    assert.deepEqual(
        {
            rating: placeEnrichment['pinkys-rottnest-island'].rating,
            userRatingCount: placeEnrichment['pinkys-rottnest-island'].userRatingCount,
            ratingSource: placeEnrichment['pinkys-rottnest-island'].ratingSource
        },
        {
            rating: 3.6,
            userRatingCount: 708,
            ratingSource: 'google_static_cache'
        }
    );
    assert.equal(placeEnrichment['isola-bar-e-cibo'].rating, 4.6);
    assert.equal(placeEnrichment['rottnest-bakery'].rating, 4);
    assert.equal(placeEnrichment['frankies-on-rotto'].rating, 4.4);
    assert.equal(placeEnrichment['geordie-bay-cafe'].userRatingCount, 517);
});

test('place enrichment records Google address checks for named food venues', () => {
    const namedFoodVenueIds = facilityData
        .filter((facility) => (
            facility.source === 'rottnest_official_eat_drink' &&
            ['cafe', 'restaurant'].includes(facility.category)
        ))
        .map((facility) => facility.id);

    assert.ok(namedFoodVenueIds.length >= 8);
    namedFoodVenueIds.forEach((id) => {
        assert.ok(placeEnrichment[id]?.googleAddress, `${id} is missing a Google address cross-check`);
        assert.equal(placeEnrichment[id]?.googleLocationCheckedAt, '2026-07-20');
    });
});

test('place enrichment overrides coordinates when Google Maps exposes a destination', () => {
    assert.deepEqual(
        {
            lat: placeEnrichment['frankies-on-rotto'].lat,
            lon: placeEnrichment['frankies-on-rotto'].lon,
            coordinate_source: placeEnrichment['frankies-on-rotto'].coordinate_source
        },
        {
            lat: -31.9954001,
            lon: 115.5405629,
            coordinate_source: 'google_maps_static_cache'
        }
    );
    assert.equal(placeEnrichment['pinkys-rottnest-island'].lat, -31.9896289);
    assert.equal(placeEnrichment['lontara'].coordinate_source, undefined);
});

test('named food venues record coordinate provenance', () => {
    const namedFoodVenues = facilityData.filter((facility) => (
        facility.source === 'rottnest_official_eat_drink' &&
        ['cafe', 'restaurant'].includes(facility.category)
    ));

    assert.ok(namedFoodVenues.length >= 8);
    namedFoodVenues.forEach((facility) => {
        assert.ok(facility.coordinate_source, `${facility.name} is missing coordinate_source`);
        assert.ok(facility.coordinate_checked_at, `${facility.name} is missing coordinate_checked_at`);
    });
    assert.equal(facilityData.find((facility) => facility.id === 'pinkys-rottnest-island')?.osm_id, 9409361909);
    assert.equal(facilityData.find((facility) => facility.id === 'the-lane-cafe')?.osm_id, 4583455993);
});

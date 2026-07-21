export const FACILITY_TYPE_LABELS = {
    cafe: 'Cafe',
    restaurant: 'Food',
    toilets: 'Toilets',
    shower: 'Showers',
    drinking_water: 'Water',
    bus_stop: 'Bus stop',
    bicycle_parking: 'Bike parking',
    bbq: 'BBQ',
    visitor_centre: 'Visitor centre'
};

const FACILITY_TYPE_ICONS = {
    cafe: '☕',
    restaurant: '🍽',
    toilets: '🚻',
    shower: '🚿',
    drinking_water: '💧',
    bus_stop: '🚌',
    bicycle_parking: '🚲',
    bbq: '♨',
    visitor_centre: 'ⓘ'
};

export function getFacilityIcon(category) {
    return FACILITY_TYPE_ICONS[category] || '📍';
}

export function getFacilityRatingLabel(place = {}) {
    if (!Number.isFinite(place.rating)) return '';

    const rating = Number(place.rating).toFixed(1);
    if (!Number.isFinite(place.userRatingCount)) return `${rating} ★`;

    return `${rating} ★ (${formatRatingCount(place.userRatingCount)})`;
}

export function getFacilityTypeLabel(place = {}) {
    const category = place.category || place.subtype || place.type;
    if (!category) return 'Place';
    if (FACILITY_TYPE_LABELS[category]) return FACILITY_TYPE_LABELS[category];

    const label = String(category).replaceAll('_', ' ').toLowerCase();
    return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getNearbyFacilities(beach, facilities = [], limit = 5, maxDistanceKm = 1) {
    if (!Number.isFinite(beach?.lat) || !Number.isFinite(beach?.lon)) return [];

    return facilities
        .filter((facility) => Number.isFinite(facility.lat) && Number.isFinite(facility.lon))
        .map((facility) => {
            const category = facility.category || facility.subtype;
            return {
                ...facility,
                type: facility.type || 'facility',
                distanceKm: roundDistance(getDistanceKm(beach.lat, beach.lon, facility.lat, facility.lon)),
                label: getFacilityTypeLabel(facility),
                icon: getFacilityIcon(category)
            };
        })
        .filter((facility) => facility.distanceKm <= maxDistanceKm)
        .sort(sortNearbyFacilities)
        .slice(0, limit);
}

export function mergeFacilityEnrichment(facilities = [], enrichment = {}) {
    return facilities.map((facility) => ({
        ...facility,
        ...(enrichment[facility.id] || {})
    }));
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
    const radius = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value) {
    return value * Math.PI / 180;
}

function roundDistance(distanceKm) {
    return Math.round(distanceKm * 10) / 10;
}

function sortNearbyFacilities(a, b) {
    return getNearbyFacilitySortScore(b) - getNearbyFacilitySortScore(a)
        || a.distanceKm - b.distanceKm
        || a.name.localeCompare(b.name);
}

function getNearbyFacilitySortScore(facility = {}) {
    const category = facility.category || facility.subtype;
    if (category === 'cafe' || category === 'restaurant') {
        const ratingScore = Number.isFinite(facility.rating) ? facility.rating * 10 : 35;
        return 100 + ratingScore - facility.distanceKm * 8;
    }
    return 50 - facility.distanceKm * 8;
}

function formatRatingCount(count) {
    if (count < 1000) return String(count);

    const thousands = count / 1000;
    const formatted = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}K`;
}

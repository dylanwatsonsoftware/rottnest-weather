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
        .sort((a, b) => a.distanceKm - b.distanceKm)
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

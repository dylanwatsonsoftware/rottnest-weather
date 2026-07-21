import { formatDistanceLabel, getDistanceKm, getFacilityIcon, getFacilityTypeLabel } from './facilities.js';

const KIND_PRIORITY = {
    beach: 0,
    landmark: 1,
    facility: 2,
    business: 3
};

export function buildPlaceSearchIndex({ beaches = [], landmarks = [], facilities = [] } = {}) {
    return [
        ...beaches.map((beach) => toSearchResult(beach, 'beach')),
        ...landmarks.map((place) => toSearchResult(place, place.type || 'landmark')),
        ...facilities.map((place) => toSearchResult(place, place.type || 'facility'))
    ].filter((result) => Number.isFinite(result.lat) && Number.isFinite(result.lon));
}

export function searchPlaces(index = [], query = '', limit = 8, origin = null) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];

    const results = index
        .map((item) => ({
            ...item,
            matchScore: getMatchScore(item, normalizedQuery)
        }))
        .filter((item) => item.matchScore !== Infinity)
        .sort((a, b) => a.matchScore - b.matchScore
            || a.name.localeCompare(b.name)
            || (KIND_PRIORITY[a.kind] ?? 9) - (KIND_PRIORITY[b.kind] ?? 9))
        .slice(0, limit)
        .map(({ matchScore, ...item }) => item);

    return addDistanceLabels(results, origin);
}

function toSearchResult(place, kind) {
    const category = place.category || place.subtype || place.type;
    const label = kind === 'beach' ? 'Beach' : getFacilityTypeLabel(place);
    const icon = kind === 'beach' ? '⌁' : getFacilityIcon(category);

    return {
        kind,
        name: place.name,
        label,
        icon,
        lat: place.lat,
        lon: place.lon,
        aliases: Array.isArray(place.aliases) ? place.aliases : [],
        category: place.category,
        subtype: place.subtype,
        type: place.type || kind
    };
}

function getMatchScore(item, query) {
    const name = normalize(item.name);
    const aliases = item.aliases.map(normalize);
    const label = normalize(item.label);

    if (name === query) return 0;
    if (name.startsWith(query)) return 1;
    if (aliases.some((alias) => alias === query || alias.startsWith(query))) return 2;
    if (name.includes(query)) return 3;
    if (aliases.some((alias) => alias.includes(query))) return 4;
    if (label.includes(query)) return 5;
    return Infinity;
}

function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function addDistanceLabels(results, origin) {
    if (!Number.isFinite(origin?.lat) || !Number.isFinite(origin?.lon)) return results;

    return results.map((result) => {
        const distance = getDistanceKm(origin.lat, origin.lon, result.lat, result.lon);
        return {
            ...result,
            distanceKm: Math.round(distance * 10) / 10,
            distanceLabel: formatDistanceLabel(distance)
        };
    });
}

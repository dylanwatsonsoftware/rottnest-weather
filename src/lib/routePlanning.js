import { formatDistanceLabel, getDistanceKm } from './facilities.js';

export function getRouteDistanceKm(route = []) {
    if (!Array.isArray(route) || route.length < 2) return 0;

    return route.slice(1).reduce((total, point, index) => {
        const previous = route[index];
        if (!isValidPoint(previous) || !isValidPoint(point)) return total;
        return total + getDistanceKm(previous.lat, previous.lon, point.lat, point.lon);
    }, 0);
}

export function getRouteDistanceLabel(distanceKm) {
    return formatDistanceLabel(distanceKm);
}

export function getRouteLegs(route = []) {
    if (!Array.isArray(route) || route.length < 2) return [];

    return route.slice(1).flatMap((point, index) => {
        const previous = route[index];
        if (!isValidPoint(previous) || !isValidPoint(point)) return [];
        return [{
            midpoint: {
                lat: (previous.lat + point.lat) / 2,
                lon: (previous.lon + point.lon) / 2
            },
            distanceLabel: formatDistanceLabel(getDistanceKm(previous.lat, previous.lon, point.lat, point.lon))
        }];
    });
}

export function formatCoordinateLabel(point) {
    if (!isValidPoint(point)) return '';
    return `${formatCoordinatePart(point.lat, 'N', 'S')}, ${formatCoordinatePart(point.lon, 'E', 'W')}`;
}

export function buildGoogleMapsCoordinateUrl(point) {
    if (!isValidPoint(point)) return '';
    const query = `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&t=k&z=17`;
}

export function buildGoogleMapsRouteUrl(route = []) {
    if (!Array.isArray(route) || route.length < 2 || route.some((point) => !isValidPoint(point))) return '';

    const origin = formatRoutePoint(route[0]);
    const destination = formatRoutePoint(route[route.length - 1]);
    const waypoints = route.slice(1, -1).map(formatRoutePoint).join('|');
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    if (waypoints) url.searchParams.set('waypoints', waypoints);
    url.searchParams.set('travelmode', 'walking');
    return url.toString();
}

function formatRoutePoint(point) {
    return `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;
}

function formatCoordinatePart(value, positiveSuffix, negativeSuffix) {
    const suffix = value >= 0 ? positiveSuffix : negativeSuffix;
    return `${Math.abs(value).toFixed(5)}°${suffix}`;
}

function isValidPoint(point = {}) {
    return Number.isFinite(point?.lat)
        && Number.isFinite(point?.lon)
        && point.lat >= -90
        && point.lat <= 90
        && point.lon >= -180
        && point.lon <= 180;
}

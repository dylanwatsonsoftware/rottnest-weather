import { getDistanceKm } from './facilities.js';

export function getPlanningSocialImage({ routePoints = [], pin = null, beaches = [], places = [], getImageUrl } = {}) {
    const target = getPlanningTarget(routePoints, pin);
    if (!target || typeof getImageUrl !== 'function') return '';

    return [...beaches, ...places]
        .filter((location) => Number.isFinite(location?.lat) && Number.isFinite(location?.lon))
        .map((location) => ({
            imageUrl: getImageUrl(location),
            distanceKm: getDistanceKm(target.lat, target.lon, location.lat, location.lon)
        }))
        .filter(({ imageUrl }) => imageUrl)
        .sort((a, b) => a.distanceKm - b.distanceKm)[0]?.imageUrl || '';
}

function getPlanningTarget(routePoints, pin) {
    const validRoute = routePoints.filter(({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon));
    if (validRoute.length >= 2) {
        return {
            lat: validRoute.reduce((sum, point) => sum + point.lat, 0) / validRoute.length,
            lon: validRoute.reduce((sum, point) => sum + point.lon, 0) / validRoute.length
        };
    }
    return Number.isFinite(pin?.lat) && Number.isFinite(pin?.lon) ? pin : null;
}

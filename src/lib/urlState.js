const LOCATION_PARAM = 'location';
const TIME_PARAM = 'time';
const VALID_LOCATION_KINDS = new Set(['beach', 'facility', 'business', 'landmark']);

export function slugifyLocationName(value = '') {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function getLocationKey(location = {}) {
    const kind = location.kind || location.type;
    if (!VALID_LOCATION_KINDS.has(kind)) return '';
    const slug = slugifyLocationName(location.id || location.name);
    return slug ? `${kind}:${slug}` : '';
}

export function parseSharedLocationKey(locationKey = '') {
    const [kind, ...slugParts] = String(locationKey).split(':');
    const slug = slugParts.join(':');
    if (!VALID_LOCATION_KINDS.has(kind) || !slug) return null;
    return { kind, slug };
}

export function buildShareUrl(baseUrl, { locationKey = '', time = '' } = {}) {
    const url = new URL(baseUrl);
    url.search = '';
    if (locationKey) {
        url.searchParams.set(LOCATION_PARAM, locationKey);
    }

    if (time) {
        url.searchParams.set(TIME_PARAM, time);
    }

    return url.toString();
}

export function getSharedLocationFromUrl(urlValue) {
    const url = new URL(urlValue);
    const locationKey = url.searchParams.get(LOCATION_PARAM) || '';
    const time = url.searchParams.get(TIME_PARAM) || '';
    return { locationKey, time };
}

export function findNearestSharedHourIndex(forecastData, sharedTime) {
    const selectedTime = new Date(sharedTime).getTime();
    if (!Number.isFinite(selectedTime) || !isSharedTimeCoveredByForecast(forecastData, sharedTime)) return null;

    let nearestIndex = 0;
    let nearestDiff = Infinity;
    forecastData.time.forEach((time, index) => {
        const diff = Math.abs(new Date(time).getTime() - selectedTime);
        if (diff < nearestDiff) {
            nearestDiff = diff;
            nearestIndex = index;
        }
    });

    return nearestIndex;
}

export function isSharedTimeCoveredByForecast(forecastData, sharedTime) {
    const selectedTime = new Date(sharedTime).getTime();
    const times = forecastData?.time || [];
    if (!Number.isFinite(selectedTime) || !times.length) return false;

    const firstTime = new Date(times[0]).getTime();
    const lastTime = new Date(times[times.length - 1]).getTime();
    if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime)) return false;

    return selectedTime >= firstTime && selectedTime <= lastTime;
}

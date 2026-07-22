const LOCATION_PARAM = 'location';
const TIME_PARAM = 'time';
const PANEL_PARAM = 'panel';
const PIN_PARAM = 'pin';
const ROUTE_PARAM = 'route';
const ROUTE_NAME_PARAM = 'routeName';
const VALID_LOCATION_KINDS = new Set(['beach', 'facility', 'business', 'landmark']);
const VALID_PANEL_MODES = new Set(['open', 'semi', 'closed']);

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

export function buildShareUrl(baseUrl, { locationKey = '', time = '', panelMode = '', pin = null, route = [], routeName = '' } = {}) {
    const url = new URL(baseUrl);
    url.search = '';
    if (locationKey) {
        url.searchParams.set(LOCATION_PARAM, locationKey);
    }

    if (time) {
        url.searchParams.set(TIME_PARAM, time);
    }

    if (VALID_PANEL_MODES.has(panelMode)) {
        url.searchParams.set(PANEL_PARAM, panelMode);
    }

    const routeParam = serializeRoute(route);
    if (routeParam) {
        url.searchParams.set(ROUTE_PARAM, routeParam);
        const cleanRouteName = sanitizeRouteName(routeName);
        if (cleanRouteName) {
            url.searchParams.set(ROUTE_NAME_PARAM, cleanRouteName);
        }
    } else {
        const pinParam = serializeCoordinate(pin);
        if (pinParam) {
            url.searchParams.set(PIN_PARAM, pinParam);
        }
    }

    return url.toString();
}

export function getSharedLocationFromUrl(urlValue) {
    const url = new URL(urlValue);
    const locationKey = url.searchParams.get(LOCATION_PARAM) || '';
    const time = url.searchParams.get(TIME_PARAM) || '';
    const panelMode = getSharedPanelMode(url.searchParams.get(PANEL_PARAM));
    const pin = parseSharedPin(url.searchParams.get(PIN_PARAM));
    const route = parseSharedRoute(url.searchParams.get(ROUTE_PARAM));
    const routeName = route.length ? sanitizeRouteName(url.searchParams.get(ROUTE_NAME_PARAM) || '') : '';
    return { locationKey, time, panelMode, pin, route, routeName };
}

function getSharedPanelMode(panelMode) {
    return VALID_PANEL_MODES.has(panelMode) ? panelMode : '';
}

export function parseSharedPin(value = '') {
    const coordinate = parseCoordinate(value);
    return coordinate && isValidCoordinate(coordinate) ? coordinate : null;
}

export function parseSharedRoute(value = '') {
    const route = String(value || '')
        .split(';')
        .map(parseCoordinate)
        .filter((coordinate) => coordinate && isValidCoordinate(coordinate));

    return route.length >= 2 ? route : [];
}

function serializeRoute(route = []) {
    if (!Array.isArray(route) || route.length < 2) return '';
    const coordinates = route
        .map(serializeCoordinate)
        .filter(Boolean);

    return coordinates.length >= 2 ? coordinates.join(';') : '';
}

function sanitizeRouteName(value = '') {
    return String(value)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
}

function serializeCoordinate(coordinate) {
    if (!isValidCoordinate(coordinate)) return '';
    return `${coordinate.lat.toFixed(5)},${coordinate.lon.toFixed(5)}`;
}

function parseCoordinate(value = '') {
    const [latValue, lonValue] = String(value).split(',');
    const lat = Number(latValue);
    const lon = Number(lonValue);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
}

function isValidCoordinate(coordinate = {}) {
    if (!coordinate) return false;
    return Number.isFinite(coordinate.lat)
        && Number.isFinite(coordinate.lon)
        && coordinate.lat >= -90
        && coordinate.lat <= 90
        && coordinate.lon >= -180
        && coordinate.lon <= 180;
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

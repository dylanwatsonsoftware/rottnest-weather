const DEFAULT_TITLE = 'Rottnest Weather';
const DEFAULT_DESCRIPTION = 'Find the best Rottnest beach for the current weather, with wind, swell, food, and facilities by forecast time.';
const DESCRIPTION_PROMISE = 'Find the best Rottnest beach for this weather.';
const DEFAULT_IMAGE = '/social-card.jpg';
const SITE_NAME = 'Rottnest Weather';
const IMAGE_ALT = 'Rottnest Weather — Find the best beach for today';

export function getRecommendedBeachCount(recommendations = []) {
    return recommendations.filter((item) => item.state === 'best' || item.state === 'good').length;
}

export function getBeachSocialImageDetails(beach) {
    if (!Array.isArray(beach?.ok_winds)) return {};

    const activities = (beach.activity_tags || [])
        .filter((tag) => !/marine sanctuary/i.test(tag))
        .reduce((selected, tag) => {
            const normalized = cleanText(tag).toLowerCase();
            if (!normalized || selected.some((item) => normalized.includes(item) || item.includes(normalized))) {
                return selected;
            }
            return [...selected, normalized];
        }, [])
        .slice(0, 2)
        .map(toSentenceCase);
    const sanctuaryText = [
        ...(beach.activity_tags || []),
        beach.exposure_note || '',
        ...(beach.caution_notes || [])
    ].join(' ');

    return {
        goodFor: activities.join(' · '),
        goodWinds: beach.ok_winds.join(' · '),
        sanctuary: /(?:marine\s+)?sanctuary(?:\s+zone|-zone)?/i.test(sanctuaryText)
    };
}

export function buildSocialMeta({
    locationName = '',
    routeName = '',
    routeDistanceLabel = '',
    routePoints = [],
    pin = null,
    pinCoordinateLabel = '',
    selectedTime = '',
    recommendedBeachCount = 0,
    conditions = {},
    url = '',
    imageUrl = '',
    imageDetails = {}
} = {}) {
    const hasRoute = Array.isArray(routePoints) && routePoints.length >= 2;
    const hasPin = !hasRoute && Number.isFinite(pin?.lat) && Number.isFinite(pin?.lon);
    const socialRouteName = hasRoute ? cleanText(routeName) || 'Shared Rottnest' : '';
    const title = hasPin
        ? `Pinned location${selectedTime ? ` at ${selectedTime}` : ''} | Rottnest`
        : buildTitle(locationName, selectedTime, socialRouteName);
    const description = hasPin
        ? buildPinDescription(pinCoordinateLabel, recommendedBeachCount, conditions)
        : buildDescription(recommendedBeachCount, conditions, socialRouteName, routeDistanceLabel);
    const absoluteUrl = url || '';
    const cleanLocationName = cleanText(locationName);
    const image = hasRoute
        ? buildRouteImageUrl(socialRouteName, routeDistanceLabel, routePoints, imageUrl, absoluteUrl)
        : hasPin
            ? buildPinImageUrl(pin, pinCoordinateLabel, imageUrl, absoluteUrl)
            : cleanLocationName && imageUrl
                ? buildLocationImageUrl(imageUrl, cleanLocationName, imageDetails, absoluteUrl)
                : toAbsoluteUrl(DEFAULT_IMAGE, absoluteUrl);

    return {
        title,
        description,
        url: absoluteUrl,
        image,
        imageAlt: hasRoute
            ? `${socialRouteName} — Shared Rottnest route`
            : hasPin
                ? 'Pinned location on Rottnest Island'
                : cleanLocationName ? `${cleanLocationName} — Find the best beach for today` : IMAGE_ALT
    };
}

function buildPinDescription(pinCoordinateLabel, recommendedBeachCount, conditions) {
    const parts = ['Open a shared pin on Rottnest.'];
    const coordinates = cleanText(pinCoordinateLabel);
    if (coordinates) parts.push(`${coordinates}.`);
    parts.push(formatRecommendationCount(recommendedBeachCount));
    const wind = formatWind(conditions);
    const swell = formatSwell(conditions);
    if (wind) parts.push(wind);
    if (swell) parts.push(swell);
    return parts.join(' ');
}

export function updateDocumentSocialMeta(documentRef, meta = {}) {
    if (!documentRef) return;

    const title = meta.title || DEFAULT_TITLE;
    const description = meta.description || DEFAULT_DESCRIPTION;
    const image = meta.image || '';
    const url = meta.url || '';

    documentRef.title = title;
    setMeta(documentRef, 'name', 'description', description);
    setMeta(documentRef, 'property', 'og:title', title);
    setMeta(documentRef, 'property', 'og:description', description);
    setMeta(documentRef, 'property', 'og:type', 'website');
    setMeta(documentRef, 'property', 'og:site_name', SITE_NAME);
    setMeta(documentRef, 'property', 'og:url', url);
    setMeta(documentRef, 'property', 'og:image', image);
    setMeta(documentRef, 'property', 'og:image:width', '1200');
    setMeta(documentRef, 'property', 'og:image:height', '630');
    setMeta(documentRef, 'property', 'og:image:alt', meta.imageAlt || IMAGE_ALT);
    setMeta(documentRef, 'name', 'twitter:card', 'summary_large_image');
    setMeta(documentRef, 'name', 'twitter:title', title);
    setMeta(documentRef, 'name', 'twitter:description', description);
    setMeta(documentRef, 'name', 'twitter:image', image);
    setMeta(documentRef, 'name', 'twitter:image:alt', meta.imageAlt || IMAGE_ALT);
}

function buildTitle(locationName, selectedTime, routeName) {
    const cleanRouteName = cleanText(routeName);
    if (cleanRouteName && selectedTime) return `${cleanRouteName} route at ${selectedTime} | Rottnest`;
    if (cleanRouteName) return `${cleanRouteName} route | Rottnest`;
    if (locationName && selectedTime) return `${locationName} at ${selectedTime} | Rottnest`;
    if (locationName) return `${locationName} | Rottnest`;
    if (selectedTime) return `Rottnest forecast at ${selectedTime}`;
    return DEFAULT_TITLE;
}

function buildDescription(recommendedBeachCount, conditions = {}, routeName = '', routeDistanceLabel = '') {
    const cleanRouteName = cleanText(routeName);
    const cleanRouteDistance = cleanText(routeDistanceLabel);
    const parts = cleanRouteName
        ? [`Plan the ${cleanRouteName} route on Rottnest.`]
        : [DESCRIPTION_PROMISE];

    if (cleanRouteDistance) parts.push(`${cleanRouteDistance}.`);
    parts.push(formatRecommendationCount(recommendedBeachCount));
    const wind = formatWind(conditions);
    const swell = formatSwell(conditions);

    if (wind) parts.push(wind);
    if (swell) parts.push(swell);
    return parts.join(' ');
}

function cleanText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
}

function toSentenceCase(value) {
    return value ? `${value[0].toUpperCase()}${value.slice(1)}` : '';
}

function formatRecommendationCount(count) {
    if (count === 1) return '1 recommended beach.';
    if (count > 1) return `${count} recommended beaches.`;
    return 'No recommended beaches at this time.';
}

function formatWind(conditions = {}) {
    if (!Number.isFinite(conditions.windSpeed)) return '';
    const speed = Math.round(conditions.windSpeed);
    const direction = conditions.windDirection ? ` ${conditions.windDirection}` : '';
    return `Wind ${speed} km/h${direction}.`;
}

function formatSwell(conditions = {}) {
    if (!Number.isFinite(conditions.swellHeight)) return '';
    return `Swell ${formatNumber(conditions.swellHeight)} m.`;
}

function formatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function setMeta(documentRef, attribute, key, content) {
    if (!content) return;

    const selector = `meta[${attribute}="${key}"]`;
    let element = documentRef.querySelector(selector);
    if (!element) {
        element = documentRef.createElement('meta');
        element.setAttribute(attribute, key);
        documentRef.head.appendChild(element);
    }
    element.content = content;
}

function toAbsoluteUrl(value, baseUrl) {
    if (!value) return '';
    try {
        return new URL(value, baseUrl || 'https://rottnest-weather.local/').href;
    } catch {
        return value;
    }
}

function buildLocationImageUrl(imageUrl, locationName, imageDetails, baseUrl) {
    const params = new URLSearchParams({ src: imageUrl, title: locationName });
    if (imageDetails.goodFor) params.set('goodFor', imageDetails.goodFor);
    if (imageDetails.goodWinds) params.set('goodWinds', imageDetails.goodWinds);
    if (imageDetails.sanctuary) params.set('sanctuary', '1');
    params.set('v', '4');
    return toAbsoluteUrl(`/social-image?${params}`, baseUrl);
}

function buildRouteImageUrl(routeName, routeDistanceLabel, routePoints, imageUrl, baseUrl) {
    const params = new URLSearchParams({
        mode: 'route',
        title: routeName,
        waypoints: String(routePoints.length),
        path: routePoints.slice(0, 20).map(({ lat, lon }) => `${lat},${lon}`).join(';'),
        v: '5'
    });
    if (routeDistanceLabel) params.set('distance', routeDistanceLabel);
    if (imageUrl) params.set('src', imageUrl);
    return toAbsoluteUrl(`/social-image?${params}`, baseUrl);
}

function buildPinImageUrl(pin, pinCoordinateLabel, imageUrl, baseUrl) {
    const coordinates = cleanText(pinCoordinateLabel) || `${pin.lat.toFixed(5)}, ${pin.lon.toFixed(5)}`;
    const params = new URLSearchParams({
        mode: 'pin',
        coordinates,
        lat: String(pin.lat),
        lon: String(pin.lon),
        v: '5'
    });
    if (imageUrl) params.set('src', imageUrl);
    return toAbsoluteUrl(`/social-image?${params}`, baseUrl);
}

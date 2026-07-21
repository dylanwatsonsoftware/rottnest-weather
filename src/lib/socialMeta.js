const DEFAULT_TITLE = 'Rottnest Weather';
const DEFAULT_DESCRIPTION = 'Find the best Rottnest beach for the current weather, with wind, swell, food, and facilities by forecast time.';
const DESCRIPTION_PROMISE = 'Find the best Rottnest beach for this weather.';
const DEFAULT_IMAGE = '/beach-images/little-salmon-bay-01.jpg';

export function getRecommendedBeachCount(recommendations = []) {
    return recommendations.filter((item) => item.state === 'best' || item.state === 'good').length;
}

export function buildSocialMeta({
    locationName = '',
    selectedTime = '',
    recommendedBeachCount = 0,
    conditions = {},
    url = '',
    imageUrl = DEFAULT_IMAGE
} = {}) {
    const title = buildTitle(locationName, selectedTime);
    const description = buildDescription(recommendedBeachCount, conditions);
    const absoluteUrl = url || '';

    return {
        title,
        description,
        url: absoluteUrl,
        image: toAbsoluteUrl(imageUrl, absoluteUrl)
    };
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
    setMeta(documentRef, 'property', 'og:url', url);
    setMeta(documentRef, 'property', 'og:image', image);
    setMeta(documentRef, 'name', 'twitter:card', 'summary_large_image');
    setMeta(documentRef, 'name', 'twitter:title', title);
    setMeta(documentRef, 'name', 'twitter:description', description);
    setMeta(documentRef, 'name', 'twitter:image', image);
}

function buildTitle(locationName, selectedTime) {
    if (locationName && selectedTime) return `${locationName} at ${selectedTime} | Rottnest`;
    if (locationName) return `${locationName} | Rottnest`;
    if (selectedTime) return `Rottnest forecast at ${selectedTime}`;
    return DEFAULT_TITLE;
}

function buildDescription(recommendedBeachCount, conditions = {}) {
    const parts = [DESCRIPTION_PROMISE, formatRecommendationCount(recommendedBeachCount)];
    const wind = formatWind(conditions);
    const swell = formatSwell(conditions);

    if (wind) parts.push(wind);
    if (swell) parts.push(swell);
    return parts.join(' ');
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

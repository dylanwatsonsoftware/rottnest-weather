import { mergeFacilityEnrichment } from '$lib/facilities.js';
import { getBeachImages } from '$lib/beachMedia.js';
import { getPrimaryPlaceImage } from '$lib/placeMedia.js';
import { buildRecommendations, getConditions } from '$lib/recommendations.js';
import { buildSocialMeta, getRecommendedBeachCount } from '$lib/socialMeta.js';
import { formatCompactTime } from '$lib/timeFormat.js';
import { findNearestSharedHourIndex, getSharedLocationFromUrl, parseSharedLocationKey, slugifyLocationName } from '$lib/urlState.js';
import beaches from '../../public/beaches.json' with { type: 'json' };
import rawFacilities from '../../public/facilities.json' with { type: 'json' };
import landmarks from '../../public/landmarks.json' with { type: 'json' };
import enrichment from '../../public/place-enrichment.json' with { type: 'json' };

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m&forecast_days=10';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine?latitude=-32.007&longitude=115.51&hourly=swell_wave_height&forecast_days=10';
const FALLBACK_IMAGE = '/beach-images/little-salmon-bay-01.jpg';

export async function load({ fetch, url, setHeaders }) {
    setHeaders({
        'cache-control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600'
    });

    const facilities = mergeFacilityEnrichment(rawFacilities, enrichment);
    const forecastData = await fetchForecast(fetch);
    const urlState = getSharedLocationFromUrl(url.href);
    const hourIndex = getInitialHourIndex(forecastData, urlState.time);
    const selectedLocation = findSelectedLocation(urlState.locationKey, { beaches, landmarks, facilities });
    const recommendations = buildRecommendations(beaches, forecastData, hourIndex);
    const imageUrl = getLocationImage(selectedLocation);
    const socialMeta = buildSocialMeta({
        locationName: selectedLocation?.name || '',
        selectedTime: formatCompactTime(forecastData?.time?.[hourIndex], { weekday: true }),
        recommendedBeachCount: getRecommendedBeachCount(recommendations),
        conditions: getConditions(forecastData, hourIndex),
        url: url.href,
        imageUrl
    });

    return {
        appData: { beaches, landmarks, facilities, forecastData, hourIndex },
        urlState,
        socialMeta
    };
}

async function fetchForecast(fetchFn) {
    const signal = AbortSignal.timeout(5000);
    const weather = await fetchJson(fetchFn, WEATHER_URL, null, signal);
    if (!weather?.hourly?.time?.length) return null;

    const marine = await fetchJson(fetchFn, MARINE_URL, null, signal);
    return {
        ...weather.hourly,
        ...(marine?.hourly?.swell_wave_height ? { swell_wave_height: marine.hourly.swell_wave_height } : {})
    };
}

async function fetchJson(fetchFn, url, fallback, signal) {
    try {
        const response = await fetchFn(url, signal ? { signal } : undefined);
        if (!response.ok) return fallback;
        return await response.json();
    } catch {
        return fallback;
    }
}

function getInitialHourIndex(forecastData, sharedTime) {
    const sharedIndex = findNearestSharedHourIndex(forecastData, sharedTime);
    if (Number.isInteger(sharedIndex)) return sharedIndex;
    const now = Date.now();
    let nearestIndex = 0;
    let nearestDifference = Infinity;
    forecastData?.time?.forEach((time, index) => {
        const difference = Math.abs(new Date(time).getTime() - now);
        if (difference < nearestDifference) {
            nearestIndex = index;
            nearestDifference = difference;
        }
    });
    return nearestIndex;
}

function findSelectedLocation(locationKey, collections) {
    const parsed = parseSharedLocationKey(locationKey);
    if (!parsed) return null;
    const candidates = parsed.kind === 'beach'
        ? collections.beaches
        : [...collections.landmarks, ...collections.facilities];
    return candidates.find((item) => slugifyLocationName(item.id || item.name) === parsed.slug) || null;
}

function getLocationImage(location) {
    if (!location) return FALLBACK_IMAGE;
    if (location.type === 'beach' || !location.type) {
        return getBeachImages(location.name)[0]?.src || FALLBACK_IMAGE;
    }
    return getPrimaryPlaceImage(location)?.src || FALLBACK_IMAGE;
}

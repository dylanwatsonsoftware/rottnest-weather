export const FORECAST_CACHE_KEY = 'rottnest-snorkelling-app-cache-v3';
export const FORECAST_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 6;

function hasForecastTimes(payload) {
    return Array.isArray(payload?.forecastData?.time) && payload.forecastData.time.length > 0;
}

function hasAppData(payload) {
    return Array.isArray(payload?.beaches) &&
        Array.isArray(payload?.landmarks) &&
        Array.isArray(payload?.facilities) &&
        hasForecastTimes(payload);
}

function isRecent(payload, now) {
    const savedAt = new Date(payload?.savedAt);
    if (Number.isNaN(savedAt.getTime())) return false;
    return now.getTime() - savedAt.getTime() <= FORECAST_CACHE_MAX_AGE_MS;
}

export function readForecastCache(storage = globalThis.localStorage, now = new Date()) {
    try {
        const raw = storage?.getItem?.(FORECAST_CACHE_KEY);
        if (!raw) return null;
        const payload = JSON.parse(raw);
        if (!hasAppData(payload) || !isRecent(payload, now)) return null;
        return payload;
    } catch (error) {
        return null;
    }
}

export function writeForecastCache(storage = globalThis.localStorage, appData, now = new Date()) {
    const payload = {
        beaches: appData?.beaches ?? [],
        landmarks: appData?.landmarks ?? [],
        facilities: appData?.facilities ?? [],
        forecastData: appData?.forecastData ?? null,
        savedAt: now.toISOString()
    };

    if (!hasAppData(payload)) return;

    try {
        storage?.setItem?.(FORECAST_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
        // Storage can fail in private browsing or under quota pressure; live data still works.
    }
}

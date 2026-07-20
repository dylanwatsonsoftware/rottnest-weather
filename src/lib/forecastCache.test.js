import assert from 'node:assert/strict';
import test from 'node:test';

import {
    FORECAST_CACHE_KEY,
    FORECAST_CACHE_MAX_AGE_MS,
    readForecastCache,
    writeForecastCache
} from './forecastCache.js';

function createStorage(initial = {}) {
    const values = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            values.set(key, value);
        },
        removeItem(key) {
            values.delete(key);
        },
        value(key) {
            return values.get(key);
        }
    };
}

const completeCachedData = {
    beaches: [{ name: 'Little Salmon Bay' }],
    landmarks: [{ name: 'Parker Point', lat: -32.009, lon: 115.541 }],
    facilities: [{ name: 'Parker Point Facilities', lat: -32.009, lon: 115.541 }],
    forecastData: {
        time: ['2026-07-20T08:00'],
        windspeed_10m: [12],
        winddirection_10m: [220],
        temperature_2m: [18],
        swell_wave_height: [0.8]
    }
};

test('readForecastCache returns a recent complete cached app payload', () => {
    const cached = {
        ...completeCachedData,
        savedAt: '2026-07-20T08:00:00.000Z'
    };
    const storage = createStorage({
        [FORECAST_CACHE_KEY]: JSON.stringify(cached)
    });

    assert.deepEqual(readForecastCache(storage, new Date('2026-07-20T10:00:00.000Z')), cached);
});

test('readForecastCache ignores stale cached forecasts', () => {
    const cached = {
        ...completeCachedData,
        savedAt: new Date(Date.parse('2026-07-20T10:00:00.000Z') - FORECAST_CACHE_MAX_AGE_MS - 1).toISOString()
    };
    const storage = createStorage({
        [FORECAST_CACHE_KEY]: JSON.stringify(cached)
    });

    assert.equal(readForecastCache(storage, new Date('2026-07-20T10:00:00.000Z')), null);
});

test('readForecastCache ignores incomplete cached forecasts', () => {
    const storage = createStorage({
        [FORECAST_CACHE_KEY]: JSON.stringify({
            ...completeCachedData,
            savedAt: '2026-07-20T08:00:00.000Z',
            forecastData: { time: [] }
        })
    });

    assert.equal(readForecastCache(storage, new Date('2026-07-20T10:00:00.000Z')), null);
});

test('writeForecastCache stores only complete app data needed for fast startup', () => {
    const storage = createStorage();

    writeForecastCache(storage, completeCachedData, new Date('2026-07-20T08:00:00.000Z'));

    assert.deepEqual(JSON.parse(storage.value(FORECAST_CACHE_KEY)), {
        ...completeCachedData,
        savedAt: '2026-07-20T08:00:00.000Z'
    });
});

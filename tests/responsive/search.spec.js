import { expect, test } from '@playwright/test';
import { getMockForecastTime, getMockForecastTimePattern, mockForecastApis } from './mockForecast.js';

test('map search jumps to places and opens beach recommendations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    await page.goto('/');

    const searchToggle = page.getByRole('button', { name: 'Open map search' });
    await expect(searchToggle).toBeVisible();
    await expect(page.locator('.recommendation-panel')).toBeVisible();

    await searchToggle.click();
    const search = page.locator('.map-search input');
    await expect(search).toBeVisible();
    await search.fill('Parker Point Bus Stop');
    await page.locator('.map-search-results').getByRole('button', { name: /Parker Point Bus Stop/i }).click();
    await expect(page.locator('.place-label.selected', { hasText: 'Parker Point Bus Stop' }).first()).toBeVisible();

    await searchToggle.click();
    await search.fill('Little Salmon');
    await page.locator('.map-search-results').getByRole('button', { name: /Little Salmon Bay/i }).click();
    await expect(page.locator('.recommendation-panel:not(.collapsed)')).toBeVisible();
    await expect(page.locator('.beach-label', { hasText: 'Little Salmon Bay' }).first()).toBeVisible();
});

test('clicking a non-beach map marker opens the selected place card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    await page.goto('/');

    await page.locator('.landmark-icon.facility', { hasText: '☕' }).first().click({ force: true });

    await expect(page.locator('.selected-map-place-card')).toBeVisible();
    await expect(page.locator('.selected-map-place-card img')).toBeVisible();
    await expect(page.locator('.selected-map-place-card')).not.toContainText('Source');
    await expect(page.getByRole('button', { name: /Share / })).toBeVisible();
    await expect(page.locator('.recommendation-panel.closed')).toBeVisible();
});

test('zooming out keeps the selected map place anchored on screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    await page.goto('/');

    await page.locator('.landmark-icon.facility', { hasText: '☕' }).first().click({ force: true });
    await expect(page.locator('.selected-map-place-card')).toBeVisible();
    await page.waitForTimeout(700);
    const before = await getSelectedMarkerCenter(page);

    await page.locator('.leaflet-control-zoom-out').click();
    await page.waitForTimeout(500);
    const after = await getSelectedMarkerCenter(page);

    expect(Math.abs(after.x - before.x)).toBeLessThan(8);
    expect(Math.abs(after.y - before.y)).toBeLessThan(8);
});

test('selected locations and forecast time are encoded in the URL for sharing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Open map search' }).click();
    const search = page.locator('.map-search input');
    await search.fill('Little Salmon');
    await page.locator('.map-search-results').getByRole('button', { name: /Little Salmon Bay/i }).click();

    await expect(page.getByRole('button', { name: 'Share Little Salmon Bay' }).first()).toBeVisible();
    await expect.poll(() => page.url()).toContain('location=beach%3Alittle-salmon-bay');
    await expect.poll(() => page.url()).toContain('time=');

    await page.getByRole('button', { name: 'Open map search' }).click();
    await search.fill('Parker Point Bus Stop');
    await page.locator('.map-search-results').getByRole('button', { name: /Parker Point Bus Stop/i }).click();

    await expect(page.getByRole('button', { name: 'Share Parker Point Bus Stop' })).toBeVisible();
    await expect.poll(() => page.url()).toContain('location=facility%3Aparker-point-bus-stop');
    await expect.poll(() => page.url()).toContain('time=');
});

async function getSelectedMarkerCenter(page) {
    return page.locator('.landmark-icon.selected').first().evaluate((marker) => {
        const rect = marker.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    });
}

test('shared beach URLs restore the selected beach and time', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    const sharedTime = getMockForecastTime(2);
    await page.goto(`/?location=beach%3Alittle-salmon-bay&time=${encodeURIComponent(sharedTime)}&panel=open`);

    await expect(page.locator('.recommendation-panel.beach-mode.open')).toBeVisible();
    await expect(page.locator('.beach-panel-title', { hasText: 'Little Salmon Bay' })).toBeVisible();
    await expect(page.locator('.detail-time-control')).toContainText(getMockForecastTimePattern(2));
    await expect(page.locator('.beach-label', { hasText: 'Little Salmon Bay' }).first()).toBeVisible();
});

test('shared URLs preserve selected beach panel state', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    const sharedTime = getMockForecastTime(2);

    await page.goto(`/?location=beach%3Alittle-salmon-bay&time=${encodeURIComponent(sharedTime)}&panel=semi`);

    await expect(page.locator('.recommendation-panel.beach-mode.semi')).toBeVisible();
    await expect(page.locator('.beach-panel-title', { hasText: 'Little Salmon Bay' })).toBeVisible();
    await expect(page.locator('.beach-mode-time-control')).toContainText(getMockForecastTimePattern(2));
    await expect.poll(() => page.url()).toContain('panel=semi');
});

test('shared cafe and dive spot URLs restore selected map places', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    const sharedTime = encodeURIComponent(getMockForecastTime(2));

    await page.goto(`/?location=facility%3Apinkys-rottnest-island&time=${sharedTime}`);
    await expect(page.locator('.selected-map-place-card', { hasText: "Pinky's Beach Club" })).toBeVisible();
    await expect(page.getByRole('button', { name: "Share Pinky's Beach Club" })).toBeVisible();
    await expect.poll(() => page.url()).toContain('location=facility%3Apinkys-rottnest-island');

    await page.goto(`/?location=landmark%3Acrystal-palace-dive-site&time=${sharedTime}`);
    await expect(page.locator('.selected-map-place-card', { hasText: 'Crystal Palace Dive Site' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share Crystal Palace Dive Site' })).toBeVisible();
    await expect.poll(() => page.url()).toContain('location=landmark%3Acrystal-palace-dive-site');
});

test('time-only shared URLs preserve future forecast dates', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);

    const sharedTime = new Date();
    sharedTime.setMinutes(0, 0, 0);
    sharedTime.setHours(sharedTime.getHours() + 216);
    const sharedTimeValue = sharedTime.toISOString().slice(0, 16);

    await page.goto(`/?time=${encodeURIComponent(sharedTimeValue)}`);

    await expect(page.locator('.recommendation-panel')).toBeVisible();
    await expect.poll(() => page.url()).toContain(`time=${encodeURIComponent(sharedTimeValue)}`);
    await expect.poll(() => page.url()).not.toContain('location=');
});

test('time-only shared URLs ignore stale cached forecasts that miss the requested date', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);

    const sharedTime = new Date();
    sharedTime.setMinutes(0, 0, 0);
    sharedTime.setHours(sharedTime.getHours() + 216);
    const sharedTimeValue = sharedTime.toISOString().slice(0, 16);

    await page.addInitScript(() => {
        const staleForecastTime = new Date();
        staleForecastTime.setMinutes(0, 0, 0);
        localStorage.setItem('rottnest-snorkelling-app-cache-v4', JSON.stringify({
            beaches: [],
            landmarks: [],
            facilities: [],
            forecastData: {
                time: [staleForecastTime.toISOString().slice(0, 16)],
                windspeed_10m: [18],
                winddirection_10m: [225],
                temperature_2m: [17],
                swell_wave_height: [1]
            },
            savedAt: new Date().toISOString()
        }));
    });

    await page.goto(`/?time=${encodeURIComponent(sharedTimeValue)}`);

    await expect(page.locator('.recommendation-panel')).toBeVisible();
    await expect.poll(() => page.url()).toContain(`time=${encodeURIComponent(sharedTimeValue)}`);
});

test('time-only shared URLs survive fresh forecast refresh after cached restore', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const sharedTime = new Date();
    sharedTime.setMinutes(0, 0, 0);
    sharedTime.setHours(sharedTime.getHours() + 216);
    const sharedTimeValue = sharedTime.toISOString().slice(0, 16);

    await page.addInitScript((selectedTime) => {
        const nowTime = new Date();
        nowTime.setMinutes(0, 0, 0);
        localStorage.setItem('rottnest-snorkelling-app-cache-v4', JSON.stringify({
            beaches: [],
            landmarks: [],
            facilities: [],
            forecastData: {
                time: [nowTime.toISOString().slice(0, 16), selectedTime],
                windspeed_10m: [18, 20],
                winddirection_10m: [225, 225],
                temperature_2m: [17, 18],
                swell_wave_height: [1, 1.1]
            },
            savedAt: new Date().toISOString()
        }));
    }, sharedTimeValue);

    await mockForecastApis(page);
    const freshForecastRefresh = page.waitForResponse((response) => response.url().includes('api.open-meteo.com'));
    await page.goto(`/?time=${encodeURIComponent(sharedTimeValue)}`);

    await expect(page.locator('.recommendation-panel')).toBeVisible();
    await freshForecastRefresh;
    await expect.poll(() => page.url()).toContain(`time=${encodeURIComponent(sharedTimeValue)}`);
});

test('map search autocomplete shows distance when browser location is available', async ({ browser }) => {
    const context = await browser.newContext({
        geolocation: { latitude: -31.9523, longitude: 115.8613 },
        permissions: ['geolocation'],
        viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    await mockForecastApis(page);
    await page.goto('http://127.0.0.1:4173/');

    await page.getByRole('button', { name: 'Open map search' }).click();
    await page.locator('.map-search input').fill('pink');

    await expect(page.locator('.map-search-result', { hasText: 'Pinky Beach' })).toContainText(/\d+(\.\d+)? km/);
    await expect(page.locator('.map-search-result', { hasText: "Pinky's Beach Club" })).toContainText(/\d+(\.\d+)? km/);

    await context.close();
});

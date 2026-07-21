import { expect, test } from '@playwright/test';
import { mockForecastApis } from './mockForecast.js';

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

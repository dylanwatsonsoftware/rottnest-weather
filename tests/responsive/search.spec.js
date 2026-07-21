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
    await search.fill('Parker Point Stop');
    await page.locator('.map-search-results').getByRole('button', { name: /Parker Point Stop/i }).click();
    await expect(page.locator('.place-label.selected', { hasText: 'Parker Point Stop' }).first()).toBeVisible();

    await searchToggle.click();
    await search.fill('Little Salmon');
    await page.locator('.map-search-results').getByRole('button', { name: /Little Salmon Bay/i }).click();
    await expect(page.locator('.recommendation-panel:not(.collapsed)')).toBeVisible();
    await expect(page.locator('.beach-label', { hasText: 'Little Salmon Bay' }).first()).toBeVisible();
});

import { expect, test } from '@playwright/test';
import { mockForecastApis } from './mockForecast.js';

test('user location appears only after moving inside Rottnest bounds', async ({ browser }) => {
    const context = await browser.newContext({
        geolocation: { latitude: -31.9523, longitude: 115.8613 },
        permissions: ['geolocation'],
        viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();
    await mockForecastApis(page);

    await page.goto('/');

    await expect(page.locator('.user-location-marker')).toHaveCount(0);

    await context.setGeolocation({ latitude: -32.006, longitude: 115.515 });
    await expect(page.locator('.user-location-marker')).toBeVisible({ timeout: 10000 });

    await context.close();
});

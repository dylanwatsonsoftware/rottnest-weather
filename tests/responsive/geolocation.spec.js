import { expect, test } from '@playwright/test';

test('user location appears only after moving inside Rottnest bounds', async ({ browser }) => {
    const context = await browser.newContext({
        geolocation: { latitude: -31.9523, longitude: 115.8613 },
        permissions: ['geolocation'],
        viewport: { width: 390, height: 844 }
    });
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:4173/');

    await expect(page.locator('.user-location-marker')).toHaveCount(0);

    await context.setGeolocation({ latitude: -32.006, longitude: 115.515 });
    await expect(page.locator('.user-location-marker')).toBeVisible({ timeout: 10000 });

    await context.close();
});

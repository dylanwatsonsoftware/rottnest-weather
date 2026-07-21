import { expect, test } from '@playwright/test';
import { mockForecastApis } from './mockForecast.js';

const viewports = [
    { name: 'narrow phone', width: 360, height: 740 },
    { name: 'large phone', width: 390, height: 844 },
    { name: 'short landscape phone', width: 667, height: 375 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 }
];

for (const viewport of viewports) {
    test(`primary layout fits ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mockForecastApis(page);
        await page.goto('/');

        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('#map')).toBeVisible();
        await expect(page.locator('.recommendation-panel')).toBeVisible();

        const metrics = await page.evaluate(() => {
            const header = document.querySelector('header').getBoundingClientRect();
            const map = document.querySelector('#map').getBoundingClientRect();
            const panel = document.querySelector('.recommendation-panel').getBoundingClientRect();

            return {
                scrollWidth: document.documentElement.scrollWidth,
                viewportWidth: window.innerWidth,
                headerHeight: header.height,
                headerBottom: header.bottom,
                mapWidth: map.width,
                mapHeight: map.height,
                panelTop: panel.top,
                panelBottom: panel.bottom
            };
        });

        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
        expect(metrics.headerHeight).toBeLessThanOrEqual(viewport.width <= 620 ? 120 : 92);
        expect(metrics.headerBottom).toBeGreaterThan(40);
        expect(metrics.mapWidth).toBeGreaterThan(0);
        expect(metrics.mapHeight).toBeGreaterThan(viewport.height * 0.65);
        expect(metrics.panelTop).toBeLessThan(viewport.height);
        expect(metrics.panelBottom).toBeGreaterThan(viewport.height - 24);
    });
}

import { expect, test } from '@playwright/test';
import { mockForecastApis } from './mockForecast.js';

test('recommendation panel responds to swipe gestures', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockForecastApis(page);
    await page.goto('/');

    const panel = page.locator('.recommendation-panel');
    const toggle = page.locator('.panel-collapse-toggle');
    await expect(panel).toHaveClass(/closed/);

    await swipe(toggle, { startY: 810, endY: 750 });
    await expect(panel).toHaveClass(/semi/);

    await swipe(toggle, { startY: 740, endY: 590 });
    await expect(panel).toHaveClass(/open/);

    await swipe(toggle, { startY: 300, endY: 455 });
    await expect(panel).toHaveClass(/closed/);
});

async function swipe(locator, { startY, endY }) {
    const touchBase = {
        identifier: 1,
        clientX: 195,
        pageX: 195,
        screenX: 195,
        radiusX: 8,
        radiusY: 8,
        rotationAngle: 0,
        force: 0.5
    };

    await locator.dispatchEvent('touchstart', {
        changedTouches: [{ ...touchBase, clientY: startY, pageY: startY, screenY: startY }]
    });
    await locator.dispatchEvent('touchend', {
        changedTouches: [{ ...touchBase, clientY: endY, pageY: endY, screenY: endY }]
    });
}

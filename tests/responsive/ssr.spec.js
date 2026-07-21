import { expect, test } from '@playwright/test';

test('deep-linked beach is present in initial SSR HTML and social metadata', async ({ request }) => {
    const response = await request.get('/?location=beach%3Alittle-salmon-bay&panel=open');
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain('Little Salmon Bay');
    expect(html).toContain('<meta property="og:title" content="Little Salmon Bay');
    expect(html).toContain('/beach-images/little-salmon-bay-01.jpg');
});

test('deep-linked facility is present in initial SSR HTML without browser JavaScript', async ({ request }) => {
    const response = await request.get('/?location=facility%3Arottnest-bakery&panel=closed');
    const html = await response.text();

    expect(response.ok()).toBeTruthy();
    expect(html).toContain('Rottnest Bakery');
    expect(html).toContain('aria-label="Selected map place"');
    expect(html).toContain('<meta property="og:title" content="Rottnest Bakery');
});

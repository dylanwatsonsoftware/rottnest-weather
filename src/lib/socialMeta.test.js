import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    buildSocialMeta,
    getRecommendedBeachCount,
    updateDocumentSocialMeta
} from './socialMeta.js';

const page = readFileSync(new URL('../App.svelte', import.meta.url), 'utf8');

test('buildSocialMeta includes selected beach time recommendations wind and swell', () => {
    const meta = buildSocialMeta({
        locationName: 'Little Salmon Bay',
        selectedTime: 'Tue 8am',
        recommendedBeachCount: 3,
        conditions: {
            windSpeed: 16,
            windDirection: 'SW',
            swellHeight: 1.2
        },
        url: 'https://rottnest.test/?location=beach%3Alittle-salmon-bay&time=2026-07-21T08%3A00',
        imageUrl: '/beach-images/little-salmon-bay-01.jpg'
    });

    assert.equal(meta.title, 'Little Salmon Bay at Tue 8am | Rottnest');
    assert.equal(meta.description, '3 recommended beaches. Wind 16 km/h SW. Swell 1.2 m.');
    assert.equal(meta.url, 'https://rottnest.test/?location=beach%3Alittle-salmon-bay&time=2026-07-21T08%3A00');
    assert.equal(meta.image, 'https://rottnest.test/beach-images/little-salmon-bay-01.jpg');
});

test('buildSocialMeta falls back to a general forecast title without a selected location', () => {
    const meta = buildSocialMeta({
        selectedTime: '27 Jul Mon 8am',
        recommendedBeachCount: 0,
        conditions: {
            windSpeed: 28,
            windDirection: 'NW'
        },
        url: 'https://rottnest.test/?time=2026-07-27T08%3A00'
    });

    assert.equal(meta.title, 'Rottnest forecast at 27 Jul Mon 8am');
    assert.equal(meta.description, 'No recommended beaches at this time. Wind 28 km/h NW.');
});

test('getRecommendedBeachCount counts best and good beach recommendations', () => {
    assert.equal(getRecommendedBeachCount([
        { state: 'best' },
        { state: 'good' },
        { state: 'watch' },
        { state: 'avoid' }
    ]), 2);
});

test('updateDocumentSocialMeta writes standard Open Graph and Twitter tags', () => {
    const tags = new Map();
    const fakeDocument = {
        title: '',
        querySelector(selector) {
            return tags.get(selector) || null;
        },
        head: {
            appendChild(element) {
                tags.set(element.selector, element);
            }
        },
        createElement(tagName) {
            const element = {
                tagName,
                attributes: {},
                setAttribute(name, value) {
                    this.attributes[name] = value;
                    if (name === 'name') this.selector = `meta[name="${value}"]`;
                    if (name === 'property') this.selector = `meta[property="${value}"]`;
                },
                getAttribute(name) {
                    return this.attributes[name];
                }
            };
            return element;
        }
    };

    updateDocumentSocialMeta(fakeDocument, {
        title: 'Little Salmon Bay at Tue 8am | Rottnest',
        description: '3 recommended beaches. Wind 16 km/h SW. Swell 1.2 m.',
        url: 'https://rottnest.test/?location=beach%3Alittle-salmon-bay',
        image: 'https://rottnest.test/beach-images/little-salmon-bay-01.jpg'
    });

    assert.equal(fakeDocument.title, 'Little Salmon Bay at Tue 8am | Rottnest');
    assert.equal(tags.get('meta[property="og:title"]').content, 'Little Salmon Bay at Tue 8am | Rottnest');
    assert.equal(tags.get('meta[name="description"]').content, '3 recommended beaches. Wind 16 km/h SW. Swell 1.2 m.');
    assert.equal(tags.get('meta[property="og:url"]').content, 'https://rottnest.test/?location=beach%3Alittle-salmon-bay');
    assert.equal(tags.get('meta[name="twitter:image"]').content, 'https://rottnest.test/beach-images/little-salmon-bay-01.jpg');
});

test('SvelteKit page renders social metadata for crawlers that do not run JavaScript', () => {
    assert.match(page, /<svelte:head>/);
    assert.match(page, /<meta name="description"/);
    assert.match(page, /<meta property="og:title"/);
    assert.match(page, /<meta property="og:description"/);
    assert.match(page, /<meta property="og:type" content="website"/);
    assert.match(page, /<meta name="twitter:card" content="summary_large_image"/);
});

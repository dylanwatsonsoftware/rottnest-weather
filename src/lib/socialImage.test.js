import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import sharp from 'sharp';
import { GET } from '../routes/social-image/+server.js';

const sourceImage = readFileSync(new URL('../../public/beach-images/little-salmon-bay-01.jpg', import.meta.url));
const endpointSource = readFileSync(new URL('../routes/social-image/+server.js', import.meta.url), 'utf8');

test('social image endpoint converts copy to vector paths for production rendering', () => {
    assert.match(endpointSource, /getPath\(/);
    assert.doesNotMatch(endpointSource, /<text\b/);
    assert.match(endpointSource, /Find the best beach for today/);
});

test('social image endpoint renders selected photography at Open Graph dimensions', async () => {
    let requestedUrl = '';
    const response = await GET({
        url: new URL('https://rottnest.test/social-image?src=%2Fbeach-images%2Flittle-salmon-bay-01.jpg&title=Little+Salmon+Bay&goodFor=Snorkel+%C2%B7+Beginner+friendly&goodWinds=N+%C2%B7+NE&sanctuary=1&v=3'),
        fetch: async (url) => {
            requestedUrl = String(url);
            return new Response(sourceImage, { status: 200, headers: { 'content-type': 'image/jpeg' } });
        }
    });

    assert.equal(response.status, 200);
    assert.equal(requestedUrl, 'https://rottnest.test/beach-images/little-salmon-bay-01.jpg');
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.match(response.headers.get('cache-control'), /s-maxage=86400/);

    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.equal(metadata.width, 1200);
    assert.equal(metadata.height, 630);
    assert.equal(metadata.format, 'jpeg');
});

test('social image endpoint rejects sources outside local location-image folders', async () => {
    let didFetch = false;
    const response = await GET({
        url: new URL('https://rottnest.test/social-image?src=https%3A%2F%2Fevil.test%2Fimage.jpg&title=Wrong'),
        fetch: async () => {
            didFetch = true;
            return new Response();
        }
    });

    assert.equal(response.status, 400);
    assert.equal(didFetch, false);
});

for (const scenario of [
    'mode=route&title=West+End+ride&distance=7.4+km&waypoints=3&path=-32.0064%2C115.5099%3B-32.0101%2C115.5152&v=5',
    'mode=pin&coordinates=-32.00640%2C+115.50990&lat=-32.0064&lon=115.5099&v=5'
]) {
    test(`social image endpoint renders ${new URLSearchParams(scenario).get('mode')} cards without a photo`, async () => {
        let didFetch = false;
        const response = await GET({
            url: new URL(`https://rottnest.test/social-image?${scenario}`),
            fetch: async () => {
                didFetch = true;
                return new Response();
            }
        });

        assert.equal(response.status, 200);
        assert.equal(didFetch, false);
        const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
        assert.equal(metadata.width, 1200);
        assert.equal(metadata.height, 630);
    });
}

test('route social cards render over their nearest location photo', async () => {
    let requestedUrl = '';
    const response = await GET({
        url: new URL('https://rottnest.test/social-image?mode=route&title=West+End+ride&waypoints=2&path=-32.0064%2C115.5099%3B-32.0101%2C115.5152&src=%2Fbeach-images%2Flittle-salmon-bay-01.jpg'),
        fetch: async (url) => {
            requestedUrl = String(url);
            return new Response(sourceImage, { status: 200 });
        }
    });

    assert.equal(response.status, 200);
    assert.equal(requestedUrl, 'https://rottnest.test/beach-images/little-salmon-bay-01.jpg');
});

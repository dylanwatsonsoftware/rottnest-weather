import sharp from 'sharp';

const SOURCE_PATTERN = /^\/(?:beach|place)-images\/[a-z0-9-]+\.jpg$/;

export async function GET({ url, fetch }) {
    const source = url.searchParams.get('src') || '';
    const title = cleanTitle(url.searchParams.get('title'));
    if (!SOURCE_PATTERN.test(source) || !title) {
        return new Response('Invalid social image request', { status: 400 });
    }

    const sourceResponse = await fetch(new URL(source, url.origin));
    if (!sourceResponse.ok) {
        return new Response('Location image unavailable', { status: 404 });
    }

    try {
        const image = await sharp(Buffer.from(await sourceResponse.arrayBuffer()))
            .resize(1200, 630, { fit: 'cover', position: 'attention' })
            .composite([{ input: buildOverlay(title) }])
            .jpeg({ quality: 88, progressive: true })
            .toBuffer();

        return new Response(image, {
            headers: {
                'content-type': 'image/jpeg',
                'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
            }
        });
    } catch {
        return new Response('Unable to render social image', { status: 500 });
    }
}

function cleanTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function buildOverlay(title) {
    const lines = wrapTitle(title);
    const fontSize = lines.length > 1 ? 72 : title.length > 22 ? 68 : 84;
    const titleMarkup = lines.map((line, index) => (
        `<text x="64" y="${238 + (index * 82)}" class="title">${escapeXml(line)}</text>`
    )).join('');
    const ctaY = 238 + (lines.length * 82) + 46;

    return Buffer.from(`
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shade" x1="0" x2="1">
                    <stop offset="0" stop-color="#031a3d" stop-opacity="0.96" />
                    <stop offset="0.5" stop-color="#031a3d" stop-opacity="0.62" />
                    <stop offset="0.82" stop-color="#031a3d" stop-opacity="0.08" />
                    <stop offset="1" stop-color="#031a3d" stop-opacity="0" />
                </linearGradient>
                <style>
                    .title { fill: #fff; font: 700 ${fontSize}px Arial, Helvetica, sans-serif; }
                    .cta { fill: #fff; font: 700 39px Arial, Helvetica, sans-serif; }
                </style>
            </defs>
            <rect width="1200" height="630" fill="url(#shade)" />
            ${titleMarkup}
            <text x="64" y="${ctaY}" class="cta">Find your best beach today</text>
        </svg>
    `);
}

function wrapTitle(title) {
    if (title.length <= 22) return [title];
    const words = title.split(' ');
    const midpoint = Math.ceil(title.length / 2);
    let splitAt = 1;
    let length = words[0].length;
    for (let index = 1; index < words.length; index += 1) {
        if (Math.abs(length - midpoint) > Math.abs(length + words[index].length + 1 - midpoint)) {
            length += words[index].length + 1;
            splitAt = index + 1;
        }
    }
    return [words.slice(0, splitAt).join(' '), words.slice(splitAt).join(' ')].filter(Boolean);
}

function escapeXml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

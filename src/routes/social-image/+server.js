import INTER_BOLD from '../../lib/assets/interBold.js';
import opentype from 'opentype.js';
import sharp from 'sharp';

const SOURCE_PATTERN = /^\/(?:beach|place)-images\/[a-z0-9-]+\.jpg$/;
const FONT_BYTES = Buffer.from(INTER_BOLD, 'base64');
const FONT = opentype.parse(
    FONT_BYTES.buffer.slice(FONT_BYTES.byteOffset, FONT_BYTES.byteOffset + FONT_BYTES.byteLength)
);

export async function GET({ url, fetch }) {
    const mode = url.searchParams.get('mode');
    if (mode === 'route' || mode === 'pin') {
        return renderPlanningCard(mode, url);
    }

    const source = url.searchParams.get('src') || '';
    const title = cleanTitle(url.searchParams.get('title'));
    const details = {
        goodFor: cleanLabel(url.searchParams.get('goodFor')),
        goodWinds: cleanLabel(url.searchParams.get('goodWinds')),
        sanctuary: url.searchParams.get('sanctuary') === '1'
    };
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
            .composite([{ input: buildOverlay(title, details) }])
            .jpeg({ quality: 88, progressive: true })
            .toBuffer();

        return imageResponse(image);
    } catch {
        return new Response('Unable to render social image', { status: 500 });
    }
}

async function renderPlanningCard(mode, url) {
    try {
        const overlay = mode === 'route' ? buildRouteCard(url) : buildPinCard(url);
        const image = await sharp(overlay)
            .jpeg({ quality: 88, progressive: true })
            .toBuffer();
        return imageResponse(image);
    } catch {
        return new Response('Unable to render social image', { status: 500 });
    }
}

function imageResponse(image) {
    return new Response(image, {
        headers: {
            'content-type': 'image/jpeg',
            'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
        }
    });
}

function cleanTitle(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function cleanLabel(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
}

function buildOverlay(title, details) {
    const lines = wrapTitle(title);
    const fontSize = lines.length > 1 ? 72 : title.length > 22 ? 68 : 84;
    const titleY = lines.length > 1 ? 150 : 190;
    const titleMarkup = lines.map((line, index) => (
        pathMarkup(line, 64, titleY + (index * 78), fontSize)
    )).join('');
    const detailRows = [
        details.goodFor ? `Good for  ${details.goodFor}` : '',
        details.goodWinds ? `Good winds  ${details.goodWinds}` : '',
        details.sanctuary ? 'Marine sanctuary' : ''
    ].filter(Boolean);
    const detailStartY = titleY + (lines.length * 78) + 42;
    const detailMarkup = detailRows.map((row, index) => (
        pathMarkup(row, 64, detailStartY + (index * 48), 27)
    )).join('');
    const ctaY = detailRows.length
        ? Math.min(detailStartY + (detailRows.length * 48) + 54, 568)
        : detailStartY + 12;
    const ctaMarkup = pathMarkup('Find the best beach for today', 64, ctaY, detailRows.length ? 30 : 39);

    return Buffer.from(`
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="shade" x1="0" x2="1">
                    <stop offset="0" stop-color="#031a3d" stop-opacity="0.96" />
                    <stop offset="0.5" stop-color="#031a3d" stop-opacity="0.62" />
                    <stop offset="0.82" stop-color="#031a3d" stop-opacity="0.08" />
                    <stop offset="1" stop-color="#031a3d" stop-opacity="0" />
                </linearGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#shade)" />
            ${titleMarkup}
            ${detailMarkup}
            ${ctaMarkup}
        </svg>
    `);
}

function buildRouteCard(url) {
    const title = cleanTitle(url.searchParams.get('title')) || 'Shared Rottnest route';
    const distance = cleanLabel(url.searchParams.get('distance'));
    const waypoints = Math.max(2, Math.min(20, Number.parseInt(url.searchParams.get('waypoints'), 10) || 2));
    const points = parseRoutePath(url.searchParams.get('path'));
    const lines = wrapTitle(title);
    const titleSize = lines.length > 1 ? 62 : title.length > 20 ? 62 : 74;
    const titleMarkup = lines.map((line, index) => pathMarkup(line, 64, 187 + (index * 68), titleSize)).join('');
    const details = [distance, `${waypoints} waypoints`].filter(Boolean).join('  ·  ');
    const detailsY = 210 + (lines.length * 68);

    return Buffer.from(`${planningSvgStart('route-gradient')}
        ${pathMarkup('SHARED ROTTNEST ROUTE', 64, 92, 24)}
        ${titleMarkup}
        ${pathMarkup(details, 64, detailsY, 29)}
        ${pathMarkup('Open this Rottnest route', 64, 550, 31)}
        ${routeTraceMarkup(points)}
        </svg>`);
}

function buildPinCard(url) {
    const coordinates = cleanLabel(url.searchParams.get('coordinates')) || 'Rottnest Island';
    return Buffer.from(`${planningSvgStart('pin-gradient')}
        ${pathMarkup('SHARED LOCATION', 64, 92, 24)}
        ${pathMarkup('Pinned location', 64, 205, 74)}
        ${pathMarkup(coordinates, 64, 278, 31)}
        ${pathMarkup('Open this Rottnest location', 64, 550, 31)}
        ${pinMarkup()}
        </svg>`);
}

function planningSvgStart(gradientId) {
    return `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="${gradientId}" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#031a3d" />
                <stop offset="0.58" stop-color="#073d61" />
                <stop offset="1" stop-color="#078b9b" />
            </linearGradient>
            <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
                <path d="M42 0H0V42" fill="none" stroke="#fff" stroke-opacity="0.07" />
            </pattern>
        </defs>
        <rect width="1200" height="630" fill="url(#${gradientId})" />
        <rect x="630" width="570" height="630" fill="url(#grid)" />
        <circle cx="1000" cy="76" r="170" fill="#53e1d0" opacity="0.08" />
        <circle cx="760" cy="590" r="210" fill="#fff" opacity="0.04" />`;
}

function parseRoutePath(value) {
    return String(value || '').split(';').map((pair) => {
        const [lat, lon] = pair.split(',').map(Number);
        return { lat, lon };
    }).filter(({ lat, lon }) => Number.isFinite(lat) && Number.isFinite(lon)
        && Math.abs(lat) <= 90 && Math.abs(lon) <= 180).slice(0, 20);
}

function routeTraceMarkup(points) {
    const fallback = [{ lat: -32.01, lon: 115.49 }, { lat: -32, lon: 115.51 }, { lat: -32.015, lon: 115.53 }];
    const route = points.length >= 2 ? points : fallback;
    const lats = route.map(({ lat }) => lat);
    const lons = route.map(({ lon }) => lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latRange = Math.max(maxLat - minLat, 0.002);
    const lonRange = Math.max(maxLon - minLon, 0.002);
    const plotted = route.map(({ lat, lon }) => ({
        x: 710 + ((lon - minLon) / lonRange) * 400,
        y: 130 + ((maxLat - lat) / latRange) * 370
    }));
    const line = plotted.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const dots = plotted.map(({ x, y }, index) => `<circle cx="${x}" cy="${y}" r="${index === 0 || index === plotted.length - 1 ? 12 : 8}" fill="#fff" stroke="#45e1d0" stroke-width="5" />`).join('');
    return `<polyline points="${line}" fill="none" stroke="#031a3d" stroke-opacity="0.32" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="${line}" fill="none" stroke="#45e1d0" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />${dots}`;
}

function pinMarkup() {
    return `<g transform="translate(885 302)">
        <circle r="150" fill="#fff" opacity="0.07" />
        <circle r="104" fill="#45e1d0" opacity="0.14" />
        <path d="M0-102C-60-102-108-54-108 6c0 82 108 180 108 180S108 88 108 6C108-54 60-102 0-102Z" fill="#45e1d0" stroke="#fff" stroke-width="10" />
        <circle cy="2" r="38" fill="#073d61" stroke="#fff" stroke-width="8" />
    </g>`;
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

function pathMarkup(text, x, y, fontSize) {
    const glyphs = [...text].map((character) => FONT.charToGlyph(character));
    const scale = fontSize / FONT.unitsPerEm;
    let cursor = x;
    const paths = glyphs.map((glyph, index) => {
        const path = glyph.getPath(cursor, y, fontSize);
        cursor += (glyph.advanceWidth || 0) * scale;
        if (index < glyphs.length - 1) {
            cursor += FONT.getKerningValue(glyph, glyphs[index + 1]) * scale;
        }
        return `<path d="${path.toPathData(2)}" />`;
    }).join('');
    return `<g fill="#fff">${paths}</g>`;
}

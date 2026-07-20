# Rottnest Snorkelling

A mobile-first Svelte/Vite app for choosing Rottnest Island snorkeling spots from current forecast conditions. It combines a Leaflet satellite map with Open-Meteo weather and marine data, then ranks beaches using a simple heuristic model.

## Features

- Ranked beach recommendations: `best`, `good`, `watch`, and `avoid`
- Wind, swell, and temperature forecast timeline
- Best-now and best-later mobile bottom sheet
- Beach detail cards with reasons, good wind directions, confidence, and nearby places
- Map filters for beach states, landmarks, facilities, and user location
- Zoom-aware map simplification to reduce marker and label clutter
- Initial map focus on the 2-3 nearby beaches with the best outlook over the next six hours
- Graceful fallback when weather or marine swell data is unavailable

## Data Model

Beach data lives in `public/beaches.json`. Required fields are:

- `name`
- `ok_winds`
- `lat`
- `lon`

Optional fields can enrich the detail sheet:

- `difficulty`
- `access`
- `exposure_note`
- `activity_tags`
- `facilities`
- `guide_note`
- `caution_notes`
- `safety_tags`
- `advisory`
- `aliases`

Use `safety_tags` for scoring-aware local risks such as `surf_break` and `wildlife_sensitive`. Use `advisory` for manual closure or watch notes, for example `{ "status": "watch", "message": "Check local signage before entering." }`.

Landmark data lives in `public/landmarks.json` and stays focused on navigation references such as the settlement and lighthouses.

Facility data lives in `public/facilities.json` using OSM-style tags where possible. Use `type: "facility"` and `category` values such as `cafe`, `toilets`, `shower`, `drinking_water`, `bus_stop`, `bicycle_parking`, `bbq`, and `visitor_centre`. Facilities are shown in Nearby beach details and can be revealed on the map with the Food & facilities filter.

Optional place ratings/details live in `public/place-enrichment.json`, keyed by facility `id`. Do not scrape Google pages into this file; only use manually curated details or data exported through permitted APIs and record the source/check date with each entry.

Beach photo metadata lives in `src/lib/beachMedia.js`; local resized image files live in `public/beach-images/`. Only add images with a reuse-friendly license, and include `sourceUrl`, `author`, `license`, and `licenseUrl` for every image so the beach detail sheet can display attribution.

## Recommendation Model

Recommendations are derived in `src/lib/recommendations.js`. Raw beach JSON is not mutated. The model weighs:

- Whether the selected wind direction is in `ok_winds`
- Wind speed
- Swell height when available
- How forgiving each beach is across wind directions

The output is heuristic guidance for planning, not safety advice.

## Development

```sh
npm install
npm run dev
npm test
npm run build
npm run test:responsive
```

The app uses Svelte 5, Vite, Leaflet, and Chart.js.

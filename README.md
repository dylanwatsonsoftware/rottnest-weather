# Rottnest Snorkelling

A mobile-first Svelte/Vite app for choosing Rottnest Island snorkeling spots from current forecast conditions. It combines a Leaflet satellite map with Open-Meteo weather and marine data, then ranks beaches using a simple heuristic model.

## Features

- Ranked beach recommendations: `best`, `good`, `watch`, and `avoid`
- Wind, swell, and temperature forecast timeline
- Best-now and best-later mobile bottom sheet
- Beach detail cards with reasons, good wind directions, confidence, and nearby landmarks
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
- `aliases`

Landmark and facility data lives in `public/landmarks.json`. Use `type: "business"` for facilities that should be controlled by the Facilities map toggle.

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
```

The app uses Svelte 5, Vite, Leaflet, and Chart.js.

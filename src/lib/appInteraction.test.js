import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const app = readFileSync(new URL('../App.svelte', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

test('map beach selection navigates with the open panel offset it will open into', () => {
    assert.match(app, /function selectBeach\(name,\s*targetPanelMode = panelMode\)/);
    assert.match(app, /getBeachSelectionMapTarget\(beach,\s*targetPanelMode,\s*mapLayout\)/);
    assert.match(app, /selectBeach\(name,\s*'open'\)/);
    assert.doesNotMatch(app, /activeTab/);
});

test('map knows when a beach was explicitly selected by the user', () => {
    assert.match(app, /selectedBeachName/);
    assert.match(app, /hasExplicitBeachSelection=\{Boolean\(selectedBeachName \|\| selectedMapPlace\)\}/);
});

test('selected non-beach places also count as explicit map selections', () => {
    assert.match(app, /hasExplicitBeachSelection=\{Boolean\(selectedBeachName \|\| selectedMapPlace\)\}/);
});

test('nearby facility and business navigation enables the places layer', () => {
    assert.match(app, /target\.type === 'facility' \|\| target\.type === 'business'/);
});

test('non-beach map place selection clears stale beach selection', () => {
    assert.match(app, /if \(isMapPlace\) \{[\s\S]*selectedBeachName = '';[\s\S]*\}/);
});

test('non-beach map places use a dismissible selected-place mode', () => {
    assert.match(app, /let selectedMapPlace = \$state\(null\)/);
    assert.match(app, /function clearSelectedMapPlace\(\)/);
    assert.match(app, /const navigationTarget = isMapPlace[\s\S]*getSelectedMapPlaceVisibleAnchor\(\)/);
    assert.match(app, /selectedMapPlace = isMapPlace \? navigationTarget : null/);
    assert.match(app, /class="selected-map-place-card"/);
    assert.match(app, /aria-label="Close selected place"/);
});

test('non-beach map place selection closes the recommendation panel enough to reveal the place card', () => {
    assert.match(app, /const isMapPlace = isMapPlaceTarget\(target\)/);
    assert.match(app, /selectedMapPlace = isMapPlace \? navigationTarget : null/);
    assert.match(app, /if \(isMapPlace\) \{[\s\S]*panelMode = 'closed'/);
});

test('food and facilities layer is visible by default', () => {
    assert.match(app, /showLandmarks: true,\s+showFacilities: true,\s+showUserLocation: true/);
});

test('recommendation rows show status heatbars instead of repeating score summaries', () => {
    const panel = readFileSync(new URL('./RecommendationPanel.svelte', import.meta.url), 'utf8');

    assert.match(panel, /getStatusWindowSummary/);
    assert.match(panel, /getRecommendationHeatbar\(item\)/);
    assert.match(panel, /class="recommendation-heatbar"/);
    assert.doesNotMatch(panel, /<small>\{item\.summary\}<\/small>/);
});

test('app hydrates cached forecast data before refreshing from the network', () => {
    assert.match(app, /import \{ readForecastCache, writeForecastCache \} from '\.\/lib\/forecastCache\.js';/);
    assert.match(app, /const cachedAppData = readForecastCache\(localStorage\);/);
    assert.match(app, /applyCachedAppData\(cachedAppData\)/);
    assert.match(app, /writeForecastCache\(localStorage,/);
});

test('app skips cached data that cannot satisfy an incoming shared forecast time', () => {
    assert.match(app, /isSharedTimeCoveredByForecast/);
    assert.match(app, /function hasPendingSharedTime\(\)/);
    assert.match(app, /if \(hasPendingSharedTime\(\) && !isSharedTimeCoveredByForecast\(cachedAppData\.forecastData,\s*sharedLocationState\.time\)\) return false/);
    assert.match(app, /if \(hasPendingSharedTime\(\)\) return/);
});

test('app releases URL updates when fresh data cannot resolve a shared time', () => {
    assert.match(app, /else if \(sharedLocationState\.time && appData\.forecastData\?\.time\?\.length\) \{[\s\S]*?didApplySharedLocationState = true;\s*\}/);
    assert.doesNotMatch(app, /else if \(sharedLocationState\.time[^}]*didApplySharedLocationState = true;\s*return;/);
});

test('app preserves the selected forecast time when fresh data replaces cached data', () => {
    assert.match(app, /function getAppDataHourIndex\(nextForecastData,\s*currentSelectedTime\)/);
    assert.match(app, /const preservedHourIndex = findNearestSharedHourIndex\(nextForecastData,\s*currentSelectedTime\)/);
    assert.match(app, /const currentSelectedTime = hasPendingSharedTime\(\)[\s\S]*\? sharedLocationState\.time[\s\S]*: forecastData\?\.time\?\.\[hourIndex\]/);
    assert.match(app, /const nextHourIndex = getAppDataHourIndex\(nextAppData\.forecastData,\s*currentSelectedTime\)/);
    assert.match(app, /hourIndex = nextHourIndex/);
    assert.doesNotMatch(app, /hourIndex = getNearestForecastHourIndex\(nextAppData\.forecastData\);/);
});

test('forecast API requests use Rottnest local time for shared URL hour matching', () => {
    assert.match(app, /window\.fetch\('https:\/\/api\.open-meteo\.com\/v1\/forecast\?[^'"]*timezone=Australia%2FPerth/);
    assert.match(app, /window\.fetch\('https:\/\/marine-api\.open-meteo\.com\/v1\/marine\?[^'"]*timezone=Australia%2FPerth/);
});

test('chart initialization waits for the browser-only Chart.js import', () => {
    const controls = readFileSync(new URL('./Controls.svelte', import.meta.url), 'utf8');
    assert.match(controls, /if \(Chart && !chart && forecastData && canvasElement\)/);
});

test('recommendation panel waits until forecast data is ready', () => {
    assert.match(app, /const hasLoadedForecast = \$derived\(!loading && Boolean\(forecastData\?\.time\?\.length\)\);/);
    assert.match(app, /\{#if hasLoadedForecast\}[\s\S]*<RecommendationPanel/);
});

test('app wires floating map search to all map data and navigation callbacks', () => {
    assert.match(app, /import MapSearch from '\.\/lib\/MapSearch\.svelte';/);
    assert.match(app, /<MapSearch/);
    assert.match(app, /beaches=\{\$state\.snapshot\(beaches\)\}/);
    assert.match(app, /landmarks=\{\$state\.snapshot\(landmarks\)\}/);
    assert.match(app, /facilities=\{\$state\.snapshot\(facilities\)\}/);
    assert.match(app, /onSelectBeach=\{selectSearchBeach\}/);
    assert.match(app, /onNavigateToMap=\{navigateToMapTarget\}/);
    assert.match(app, /function selectSearchBeach\(name\)/);
    assert.match(app, /selectBeach\(name,\s*'open'\)/);
    assert.match(app, /panelOpenRequest \+= 1/);
});

test('map place markers use selected-place navigation for deep links', () => {
    const map = readFileSync(new URL('./Map.svelte', import.meta.url), 'utf8');

    assert.match(app, /<Map[\s\S]*onNavigateToMap=\{navigateToMapTarget\}/);
    assert.match(map, /onNavigateToMap = \(\) => \{\}/);
    assert.match(map, /const selectPlace = \(\) => \{[\s\S]*getPlaceNavigationTarget\(place\)[\s\S]*onNavigateToMap\(target\)/);
    assert.match(map, /\.on\('click',\s*selectPlace\)/);
    assert.match(map, /function getPlaceNavigationTarget\(place\)/);
    assert.match(map, /getPanelModeMapOffset\(panelMode,\s*mapLayout\)/);
});

test('map place markers do not open competing Leaflet popups', () => {
    const map = readFileSync(new URL('./Map.svelte', import.meta.url), 'utf8');
    const initLandmarksStart = map.indexOf('function initLandmarks()');
    const getPlaceNavigationTargetStart = map.indexOf('function getPlaceNavigationTarget', initLandmarksStart);
    const initLandmarksBody = map.slice(initLandmarksStart, getPlaceNavigationTargetStart);

    assert.doesNotMatch(initLandmarksBody, /bindPopup/);
});

test('selected map places request a close zoom level', () => {
    const map = readFileSync(new URL('./Map.svelte', import.meta.url), 'utf8');
    const search = readFileSync(new URL('./MapSearch.svelte', import.meta.url), 'utf8');

    assert.match(map, /getMapNavigationTarget\(\s*place,\s*16,/);
    assert.match(search, /getMapNavigationTarget\(\s*result,\s*16,/);
    const panel = readFileSync(new URL('./RecommendationPanel.svelte', import.meta.url), 'utf8');
    assert.match(panel, /getMapNavigationTarget\(place,\s*16,/);
});

test('map and search beach selections request the panel detail scroll', () => {
    assert.match(app, /let panelScrollRequest = \$state\(0\)/);
    assert.match(app, /function revealBeachInPanel\(name\)/);
    assert.match(app, /panelMode = 'open';\s+panelOpenRequest \+= 1;\s+panelScrollRequest \+= 1;/);
    assert.match(app, /onSelectBeach=\{revealBeachInPanel\}/);
    assert.match(app, /\{panelScrollRequest\}/);
});

test('in-bounds user location flows into map search distance labels', () => {
    assert.match(app, /let userLocation = \$state\(null\)/);
    assert.match(app, /onUserLocationChange=\{\(location\) => userLocation = location\}/);
    assert.match(app, /\{userLocation\}[\s\S]*onSelectBeach=\{selectSearchBeach\}/);
});

test('selected beach details receive user location for distance labels', () => {
    assert.match(app, /<RecommendationPanel[\s\S]*\{userLocation\}/);
});

test('selected beach and place state is encoded in the address bar for sharing', () => {
    assert.match(app, /import \{[\s\S]*buildShareUrl[\s\S]*getSharedLocationFromUrl[\s\S]*getLocationKey[\s\S]*findNearestSharedHourIndex[\s\S]*parseSharedLocationKey[\s\S]*slugifyLocationName[\s\S]*\} from '\.\/lib\/urlState\.js';/);
    assert.match(app, /let sharedLocationState = \$state/);
    assert.match(app, /let currentShareUrl = \$state\(getInitialUrl\(\)\)/);
    assert.match(app, /function updateShareUrl\(\)/);
    assert.match(app, /time:\s*forecastData\.time\[hourIndex\]/);
    assert.match(app, /panelMode/);
    assert.doesNotMatch(app, /time:\s*locationKey \? forecastData\.time\[hourIndex\] : ''/);
    assert.match(app, /history\.replaceState\(history\.state,\s*'',\s*nextUrl\)/);
    assert.match(app, /\$effect\(\(\) => \{[\s\S]*updateShareUrl\(\)/);
    assert.match(app, /shareUrl=\{currentShareUrl\}/);
});

test('share buttons show visible copy feedback', () => {
    assert.match(app, /let shareStatus = \$state\(''\)/);
    assert.match(app, /const shareSucceeded = \$derived\(shareStatus === 'Link copied'\)/);
    assert.match(app, /function showShareStatus\(message\)/);
    assert.match(app, /showShareStatus\('Link copied'\)/);
    assert.match(app, /class="share-toast"/);
    assert.match(app, /aria-live="polite"/);
    assert.match(app, /class:copied=\{shareSucceeded\}/);
    assert.match(app, /\{shareSucceeded \? 'Copied' : 'Share'\}/);
    assert.match(app, /shareSucceeded=\{shareSucceeded\}/);
});

test('social meta follows selected location time recommendations and conditions', () => {
    assert.match(app, /import \{ buildSocialMeta,\s*getBeachSocialImageDetails,\s*getRecommendedBeachCount \} from '\.\/lib\/socialMeta\.js';/);
    assert.match(app, /const selectedSocialLocationName = \$derived/);
    assert.match(app, /const selectedSocialImage = \$derived/);
    assert.match(app, /getPrimaryPlaceImage\(selectedMapPlace\)/);
    assert.match(app, /getBeachImages\(selectedRecommendation\?\.beach\?\.name\)\[0\]/);
    assert.match(app, /buildSocialMeta\(\{[\s\S]*locationName:\s*selectedSocialLocationName[\s\S]*selectedTime:\s*selectedForecastTime[\s\S]*recommendedBeachCount:\s*getRecommendedBeachCount\(recommendations\)[\s\S]*conditions:\s*currentConditions[\s\S]*url:\s*currentShareUrl/);
    assert.match(app, /imageUrl:\s*selectedSocialImage\?\.src/);
    assert.match(app, /imageDetails:\s*getBeachSocialImageDetails\(selectedMapPlace \? null : selectedRecommendation\?\.beach\)/);
    assert.match(app, /routePoints/);
    assert.match(app, /pin:\s*droppedPin/);
    assert.match(app, /pinCoordinateLabel/);
    assert.match(app, /<svelte:head>[\s\S]*currentSocialMeta\.title/);
    assert.doesNotMatch(app, /updateDocumentSocialMeta\(document/);
});

test('incoming shared beach and place links are restored after app data loads', () => {
    assert.match(app, /sharedLocationState = getSharedLocationFromUrl\(window\.location\.href\)/);
    assert.match(app, /function applySharedLocationState\(appData\)/);
    assert.match(app, /findNearestSharedHourIndex\(appData\.forecastData,\s*sharedLocationState\.time\)/);
    assert.match(app, /parseSharedLocationKey\(sharedLocationState\.locationKey\)/);
    assert.match(app, /selectedBeachName = beach\.name/);
    assert.match(app, /selectedMapPlace = getSharedMapPlaceTarget\(place\)/);
});

test('client hydration re-resolves shared time against the refreshed forecast', () => {
    assert.match(app, /onMount\(\(\) => \{\s*didApplySharedLocationState = false;\s*sharedLocationState = getSharedLocationFromUrl\(window\.location\.href\)/);
});

test('incoming shared beach links restore the beach panel fully open', () => {
    assert.match(app, /selectedBeachName = beach\.name/);
    assert.match(app, /const sharedPanelMode = sharedLocationState\.panelMode \|\| 'open'/);
    assert.match(app, /panelMode = sharedPanelMode/);
    assert.match(app, /getBeachSelectionMapTarget\(beach,\s*sharedPanelMode,\s*mapLayout\)/);
    assert.match(app, /if \(sharedPanelMode === 'open'\) panelOpenRequest \+= 1/);
});

test('incoming time-only links can restore recommendation panel state', () => {
    assert.match(app, /if \(!parsedLocation\) \{[\s\S]*if \(sharedLocationState\.panelMode\) panelMode = sharedLocationState\.panelMode/);
});

test('selected map place card derives distance from the current user location', () => {
    assert.match(app, /import \{ formatDistanceLabel,\s*getDistanceKm/);
    assert.match(app, /const selectedMapPlaceDistanceLabel = \$derived/);
    assert.match(app, /getDistanceKm\(userLocation\.lat,\s*userLocation\.lon,\s*selectedMapPlace\.lat,\s*selectedMapPlace\.lon\)/);
    assert.match(app, /class="selected-map-place-distance"/);
    assert.match(app, /\{selectedMapPlaceDistanceLabel\}/);
});

test('selected map place card hides source chips and shows bundled image and rating details when available', () => {
    assert.match(app, /import \{ getPlaceImages,\s*getPrimaryPlaceImage \} from '\.\/lib\/placeMedia\.js';/);
    assert.match(app, /const selectedMapPlaceImages = \$derived\(getPlaceImages\(selectedMapPlace\?\.name\)\)/);
    assert.match(app, /class:has-images=\{selectedMapPlaceImages\.length\}/);
    assert.match(app, /class="selected-map-place-image-strip"/);
    assert.match(app, /\{#each selectedMapPlaceImages as image \(image\.src\)\}/);
    assert.match(app, /class="selected-map-place-image"/);
    assert.match(app, /src=\{image\.src\}/);
    assert.match(app, /alt=\{image\.alt\}/);
    assert.match(app, /class="selected-map-place-rating"/);
    assert.match(app, /\{selectedMapPlace\.ratingLabel\}/);
    assert.doesNotMatch(app, /function getSelectedMapPlaceLinks/);
    assert.doesNotMatch(app, /class="selected-map-place-links"/);
});

test('selected map place card has a share link button', () => {
    assert.match(app, /class="selected-map-place-share"/);
    assert.match(app, /aria-label="Share \{selectedMapPlace\.name\}"/);
    assert.match(app, /onclick=\{\(\) => shareCurrentLocation\(\)\}/);
    assert.match(app, /class:copied=\{shareSucceeded\}/);
    assert.match(app, /\{shareSucceeded \? '✓' : '🔗'\}/);
});

test('app wires route planning and dropped pin sharing into the map', () => {
    const map = readFileSync(new URL('./Map.svelte', import.meta.url), 'utf8');

    assert.match(app, /import \{[\s\S]*buildGoogleMapsCoordinateUrl[\s\S]*buildGoogleMapsRouteUrl[\s\S]*formatCoordinateLabel[\s\S]*getRouteDistanceKm[\s\S]*getRouteDistanceLabel[\s\S]*\} from '\.\/lib\/routePlanning\.js';/);
    assert.match(app, /let routeMode = \$state\('off'\)/);
    assert.match(app, /let routePoints = \$state\(getInitialUrlState\(\)\.route \|\| \[\]\)/);
    assert.match(app, /let routeName = \$state\(getInitialUrlState\(\)\.routeName \|\| ''\)/);
    assert.match(app, /let droppedPin = \$state\(getInitialUrlState\(\)\.pin \|\| null\)/);
    assert.match(app, /function handleMapPlanningPoint\(point\)/);
    assert.match(app, /function navigateToDroppedPin\(pin\)/);
    assert.match(app, /navigateToDroppedPin\(sharedLocationState\.pin\)/);
    assert.match(map, /initLandmarks\(\);\s*updatePlanningLayers\(\);\s*fitInitialFocus\(\);/);
    assert.match(app, /routeMode === 'route'/);
    assert.match(app, /routeMode === 'pin'/);
    assert.match(app, /class="route-planner"/);
    assert.match(app, /routeMode !== 'pin' && \(routeMode === 'route' \|\| routePoints\.length\)/);
    assert.match(app, /class="dropped-pin-card"/);
    assert.match(app, /googleMapsPinUrl/);
    assert.match(app, /googleMapsRouteUrl/);
    assert.match(app, /href=\{googleMapsRouteUrl\}/);
    assert.match(app, /class="google-maps-action"/);
    assert.match(app, /src="\/google-maps-icon\.png"/);
    assert.match(app, /alt="Google Maps"/);
    assert.doesNotMatch(app, /google-maps-icon-green/);
    assert.match(app, /Open route/);
    assert.match(app, /Open in Google Maps/);
    assert.match(app, /routeDistanceLabel/);
    assert.match(app, /pinCoordinateLabel/);
    assert.match(app, /pin:\s*droppedPin/);
    assert.match(app, /route:\s*routePoints/);
    assert.match(app, /routeName/);
    assert.match(app, /placeholder="Name this route"/);
    assert.match(app, /bind:value=\{routeName\}/);
    assert.match(app, /routeMode=\{routeMode\}/);
    assert.match(app, /routePoints=\{\$state\.snapshot\(routePoints\)\}/);
    assert.match(app, /\{droppedPin\}/);
    assert.match(app, /onPlanningPoint=\{handleMapPlanningPoint\}/);

    assert.match(map, /routeMode = 'off'/);
    assert.match(map, /routePoints = \[\]/);
    assert.match(map, /droppedPin = null/);
    assert.match(map, /onPlanningPoint = \(\) => \{\}/);
    assert.match(map, /function handlePlanningClick/);
    assert.match(map, /onPlanningPoint\(\{ lat: latlng\.lat,\s*lon: latlng\.lng \}\)/);
    assert.match(map, /L\.polyline/);
    assert.match(map, /route-waypoint-marker/);
    assert.match(map, /dropped-pin-marker/);
    assert.match(css, /\.route-waypoint-marker\s*{[^}]*background:\s*#6f4bc2 !important/s);
    assert.doesNotMatch(css, /\.route-waypoint-marker\s*{[^}]*background:\s*#0b7182 !important/s);
    assert.match(map, /class="dropped-pin-glyph"/);
    assert.match(map, /<circle cx="17" cy="17" r="7"/);
    assert.match(map, /<line x1="17" y1="5" x2="17" y2="29"/);
    assert.doesNotMatch(map, /html:\s*'<span>⌖<\/span>'/);
});

test('map receives all scored beaches so filtered states can shrink instead of disappear', () => {
    assert.match(app, /const mapRecommendations = \$derived/);
    assert.match(app, /filters\.showBeaches === false \? \[\] : recommendations/);
    assert.match(app, /recommendations=\{\$state\.snapshot\(mapRecommendations\)\}/);
    assert.doesNotMatch(app, /visibleRecommendations\.some\(\(item\) => item\.beach\.name === selectedRecommendation\?\.beach\.name\)/);
});

test('explicit beach selection switches recommendation panel into beach view mode', () => {
    assert.match(app, /function clearSelectedBeach\(\)/);
    assert.match(app, /selectedBeachName = ''/);
    assert.match(app, /function clearSelectedBeach\(\) \{[\s\S]*selectedBeachName = '';[\s\S]*panelMode = 'closed';[\s\S]*\}/);
    assert.match(app, /const isBeachView = \$derived\(Boolean\(selectedBeachName && selectedRecommendation\)\)/);
    assert.match(app, /recommendations\.find\(\(item\) => item\.beach\.name === selectedBeachName\) \|\| null/);
    assert.doesNotMatch(app, /recommendations\.find\(\(item\) => item\.beach\.name === selectedBeachName\) \|\| recommendations\[0\] \|\| null/);
    assert.match(app, /isBeachView=\{isBeachView\}/);
    assert.match(app, /onCloseBeach=\{clearSelectedBeach\}/);
});

test('closing selected beach clears stale map navigation requests', () => {
    assert.match(app, /function clearSelectedBeach\(\) \{[\s\S]*selectedBeachName = '';[\s\S]*mapNavigationRequest = null;[\s\S]*panelMode = 'closed';[\s\S]*\}/);
});

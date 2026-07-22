<script>
    import { onMount } from 'svelte';
    import Header from './lib/Header.svelte';
    import Map from './lib/Map.svelte';
    import MapSearch from './lib/MapSearch.svelte';
    import RecommendationPanel from './lib/RecommendationPanel.svelte';
    import {
        buildRecommendations,
        filterRecommendations,
        getConditions,
        getSafetyNotices
    } from './lib/recommendations.js';
    import { formatDistanceLabel, getDistanceKm, getFacilityRatingLabel, getFacilityTypeLabel, mergeFacilityEnrichment } from './lib/facilities.js';
    import { readForecastCache, writeForecastCache } from './lib/forecastCache.js';
    import { getBeachSelectionMapTarget, getMapLayout, getMapLayoutChangeTarget } from './lib/mapFocus.js';
    import { getBeachImages } from './lib/beachMedia.js';
    import { getPlaceImages, getPrimaryPlaceImage } from './lib/placeMedia.js';
    import { buildSocialMeta, getBeachSocialImageDetails, getRecommendedBeachCount } from './lib/socialMeta.js';
    import { getPlanningSocialImage } from './lib/socialMedia.js';
    import {
        buildGoogleMapsCoordinateUrl,
        buildGoogleMapsRouteUrl,
        formatCoordinateLabel,
        getRouteDistanceKm,
        getRouteDistanceLabel
    } from './lib/routePlanning.js';
    import {
        buildShareUrl,
        getSharedLocationFromUrl,
        getLocationKey,
        findNearestSharedHourIndex,
        isSharedTimeCoveredByForecast,
        parseSharedLocationKey,
        slugifyLocationName
    } from './lib/urlState.js';
    import { formatCompactTime } from './lib/timeFormat.js';
    import './app.css';

    let {
        initialData = {},
        initialUrlState = { locationKey: '', time: '', panelMode: '' },
        initialUrl = ''
    } = $props();

    let beaches = $state(getInitialData('beaches', []));
    let landmarks = $state(getInitialData('landmarks', []));
    let facilities = $state(getInitialData('facilities', []));
    let forecastData = $state(getInitialData('forecastData', null));
    let hourIndex = $state(getInitialData('hourIndex', 0));
    let loading = $state(!getInitialData('forecastData', null)?.time?.length);
    let loadError = $state('');
    let mapZoom = $state(12);
    let selectedBeachName = $state('');
    let panelMode = $state('closed');
    let panelOpenRequest = $state(0);
    let panelScrollRequest = $state(0);
    let mapNavigationRequest = $state(null);
    let selectedMapPlace = $state(null);
    let userLocation = $state(null);
    let routeMode = $state('off');
    let routePoints = $state(getInitialUrlState().route || []);
    let routeName = $state(getInitialUrlState().routeName || '');
    let routePlannerExpanded = $state(!(getInitialUrlState().route || []).length);
    let droppedPin = $state(getInitialUrlState().pin || null);
    let sharedLocationState = $state(getInitialUrlState());
    let currentShareUrl = $state(getInitialUrl());
    let shareStatus = $state('');
    let shareStatusTimer = null;
    let mapNavigationSequence = 0;
    let didApplySharedLocationState = false;
    let mapLayout = $state('default');
    let filters = $state({
        states: {
            best: true,
            good: true,
            watch: true,
            avoid: false
        },
        showBeaches: true,
        showLandmarks: true,
        showFacilities: true,
        showUserLocation: true,
        minimumScore: 0,
        includeLeastBad: false
    });

    function getInitialData(key, fallback) {
        return initialData[key] ?? fallback;
    }

    function getInitialUrlState() {
        return initialUrlState;
    }

    function getInitialUrl() {
        return initialUrl;
    }

    function updateStateFilter(state, value) {
        filters = {
            ...filters,
            states: {
                ...filters.states,
                [state]: value
            }
        };
    }

    function updateLayerFilter(name, value) {
        filters = {
            ...filters,
            [name]: value
        };
    }

    function handleMapPlanningPoint(point) {
        if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lon)) return;

        if (routeMode === 'route') {
            routePlannerExpanded = true;
            routePoints = [...routePoints, point];
            droppedPin = null;
            selectedBeachName = '';
            selectedMapPlace = null;
            mapNavigationRequest = null;
        }

        if (routeMode === 'pin') {
            droppedPin = point;
            routeMode = 'off';
            selectedBeachName = '';
            selectedMapPlace = null;
            mapNavigationRequest = null;
        }
    }

    function startRoutePlanning() {
        routeMode = routeMode === 'route' ? 'off' : 'route';
        if (routeMode === 'route') {
            routePlannerExpanded = true;
            droppedPin = null;
            panelMode = 'closed';
        }
    }

    function startPinDrop() {
        routeMode = routeMode === 'pin' ? 'off' : 'pin';
        if (routeMode === 'pin') {
            panelMode = 'closed';
        }
    }

    function undoRoutePoint() {
        routePoints = routePoints.slice(0, -1);
    }

    function clearRoute() {
        routePoints = [];
        routeName = '';
        if (routeMode === 'route') routeMode = 'off';
    }

    function clearDroppedPin() {
        droppedPin = null;
        if (routeMode === 'pin') routeMode = 'off';
    }

    function navigateToDroppedPin(pin) {
        if (!Number.isFinite(pin?.lat) || !Number.isFinite(pin?.lon)) return;
        navigateToMapTarget({
            name: 'Pinned location',
            type: 'pin',
            lat: pin.lat,
            lon: pin.lon,
            zoom: 16,
            visibleAnchor: getSelectedMapPlaceVisibleAnchor()
        });
    }

    function navigateToMapTarget(target) {
        if (!target) return;
        mapNavigationSequence += 1;
        const isMapPlace = isMapPlaceTarget(target);
        const navigationTarget = isMapPlace
            ? {
                ...target,
                visibleAnchor: getSelectedMapPlaceVisibleAnchor()
            }
            : target;
        if (isMapPlace) {
            selectedBeachName = '';
        }
        selectedMapPlace = isMapPlace ? navigationTarget : null;
        mapNavigationRequest = {
            ...navigationTarget,
            requestId: mapNavigationSequence
        };

        if (isMapPlace) {
            panelMode = 'closed';
        }

        if (target.type === 'landmark') {
            filters = {
                ...filters,
                showLandmarks: true
            };
        }

        if (target.type === 'facility' || target.type === 'business') {
            filters = {
                ...filters,
                showFacilities: true
            };
        }
    }

    function getSelectedMapPlaceVisibleAnchor() {
        return {
            targetXRatio: 0.5,
            targetYRatio: 0.5,
            constrainVerticalByPanel: true,
            waitForPanelTransition: true
        };
    }

    function selectBeach(name, targetPanelMode = panelMode) {
        selectedMapPlace = null;
        selectedBeachName = name;
        const beach = beaches.find((item) => item.name === name);
        const target = getBeachSelectionMapTarget(beach, targetPanelMode, mapLayout);
        if (target) navigateToMapTarget(target);
    }

    function clearSelectedMapPlace() {
        selectedMapPlace = null;
        mapNavigationRequest = null;
    }

    function clearSelectedBeach() {
        selectedBeachName = '';
        mapNavigationRequest = null;
        panelMode = 'closed';
    }

    function isMapPlaceTarget(target) {
        return target?.type === 'landmark' || target?.type === 'facility' || target?.type === 'business';
    }

    function getSharedMapPlaceTarget(place) {
        if (!place) return null;
        return {
            ...place,
            type: place.type || 'landmark',
            label: place.label || getFacilityTypeLabel(place),
            distanceLabel: '',
            ratingLabel: getFacilityRatingLabel(place)
        };
    }

    function findSharedPlace(collection = [], parsedLocation) {
        if (!parsedLocation) return null;
        return collection.find((place) => slugifyLocationName(place.id || place.name) === parsedLocation.slug) || null;
    }

    function hasPendingSharedTime() {
        return Boolean(sharedLocationState.time && !didApplySharedLocationState);
    }

    function applySharedLocationState(appData) {
        if (didApplySharedLocationState) return;

        const sharedHourIndex = findNearestSharedHourIndex(appData.forecastData, sharedLocationState.time);
        if (Number.isInteger(sharedHourIndex)) {
            hourIndex = sharedHourIndex;
            didApplySharedLocationState = true;
        } else if (sharedLocationState.time && appData.forecastData?.time?.length) {
            // A loaded forecast cannot satisfy this URL. Release reactive URL updates,
            // but continue applying the location so SSR still renders useful content.
            didApplySharedLocationState = true;
        } else {
            didApplySharedLocationState = true;
        }

        const parsedLocation = parseSharedLocationKey(sharedLocationState.locationKey);
        if (!parsedLocation) {
            if (sharedLocationState.panelMode) panelMode = sharedLocationState.panelMode;
            return;
        }

        if (parsedLocation.kind === 'beach') {
            const beach = findSharedPlace(appData.beaches, parsedLocation);
            if (!beach) return;

            const sharedPanelMode = sharedLocationState.panelMode || 'open';
            selectedMapPlace = null;
            selectedBeachName = beach.name;
            panelMode = sharedPanelMode;
            if (sharedPanelMode === 'open') panelOpenRequest += 1;
            const target = getBeachSelectionMapTarget(beach, sharedPanelMode, mapLayout);
            if (target) navigateToMapTarget(target);
            return;
        }

        const place = findSharedPlace([...appData.landmarks, ...appData.facilities], parsedLocation);
        if (!place) return;

        selectedBeachName = '';
        selectedMapPlace = getSharedMapPlaceTarget(place);
        navigateToMapTarget(selectedMapPlace);
    }

    function updateShareUrl() {
        if (typeof window === 'undefined' || !forecastData?.time?.length) return '';
        if (hasPendingSharedTime()) return '';

        const locationKey = selectedMapPlace
            ? getLocationKey(selectedMapPlace)
            : getLocationKey({ type: 'beach', name: selectedBeachName });
        const nextUrl = buildShareUrl(window.location.href, {
            locationKey,
            time: forecastData.time[hourIndex],
            panelMode,
            pin: droppedPin,
            route: routePoints,
            routeName
        });

        currentShareUrl = nextUrl;
        if (window.location.href !== nextUrl) {
            history.replaceState(history.state, '', nextUrl);
        }
        return nextUrl;
    }

    async function shareCurrentLocation() {
        const url = updateShareUrl() || currentShareUrl || window.location.href;
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(url);
            showShareStatus('Link copied');
        } catch (error) {
            showShareStatus('Copy failed');
        }
        return url;
    }

    function showShareStatus(message) {
        shareStatus = message;
        window.clearTimeout(shareStatusTimer);
        shareStatusTimer = window.setTimeout(() => {
            shareStatus = '';
        }, 5000);
    }

    function selectSearchBeach(name) {
        revealBeachInPanel(name);
    }

    function revealBeachInPanel(name) {
        selectBeach(name, 'open');
        panelMode = 'open';
        panelOpenRequest += 1;
        panelScrollRequest += 1;
        updateShareUrl();
    }

    function getNearestForecastHourIndex(nextForecastData, now = new Date()) {
        let nearestHourIndex = 0;
        let minDiff = Infinity;

        nextForecastData?.time?.forEach((time, index) => {
            const diff = Math.abs(new Date(time) - now);
            if (diff < minDiff) {
                minDiff = diff;
                nearestHourIndex = index;
            }
        });

        return nearestHourIndex;
    }

    function getAppDataHourIndex(nextForecastData, currentSelectedTime) {
        const preservedHourIndex = findNearestSharedHourIndex(nextForecastData, currentSelectedTime);
        if (Number.isInteger(preservedHourIndex)) {
            return preservedHourIndex;
        }

        return getNearestForecastHourIndex(nextForecastData);
    }

    function applyAppData(nextAppData) {
        const currentSelectedTime = hasPendingSharedTime()
            ? sharedLocationState.time
            : forecastData?.time?.[hourIndex];
        const nextHourIndex = getAppDataHourIndex(nextAppData.forecastData, currentSelectedTime);
        beaches = nextAppData.beaches;
        landmarks = nextAppData.landmarks;
        facilities = nextAppData.facilities;
        forecastData = nextAppData.forecastData;
        hourIndex = nextHourIndex;
        applySharedLocationState(nextAppData);
    }

    function applyCachedAppData(cachedAppData) {
        if (!cachedAppData) return false;
        if (hasPendingSharedTime() && !isSharedTimeCoveredByForecast(cachedAppData.forecastData, sharedLocationState.time)) return false;
        applyAppData(cachedAppData);
        loading = false;
        loadError = '';
        return true;
    }

    onMount(() => {
        didApplySharedLocationState = false;
        sharedLocationState = getSharedLocationFromUrl(window.location.href);
        droppedPin = sharedLocationState.pin;
        routePoints = sharedLocationState.route;
        routeName = sharedLocationState.routeName;
        routePlannerExpanded = !sharedLocationState.route.length;
        navigateToDroppedPin(sharedLocationState.pin);

        function updateMapLayout() {
            const nextMapLayout = getMapLayout({
                width: window.innerWidth,
                height: window.innerHeight
            });
            const previousMapLayout = mapLayout;
            mapLayout = nextMapLayout;

            const beach = beaches.find((item) => item.name === selectedBeachName);
            const target = getMapLayoutChangeTarget(beach, panelMode, previousMapLayout, nextMapLayout);
            if (target) navigateToMapTarget(target);
        }

        updateMapLayout();
        window.addEventListener('resize', updateMapLayout);
        window.addEventListener('orientationchange', updateMapLayout);

        async function loadAppData() {
            try {
                const [beachesRes, landmarksRes, facilitiesRes, enrichmentRes] = await Promise.all([
                    fetch('/beaches.json'),
                    fetch('/landmarks.json'),
                    fetch('/facilities.json'),
                    fetch('/place-enrichment.json')
                ]);

                const nextBeaches = await beachesRes.json();
                const nextLandmarks = await landmarksRes.json();
                const nextFacilities = mergeFacilityEnrichment(await facilitiesRes.json(), await enrichmentRes.json());

                const weatherRes = await window.fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m,precipitation&forecast_days=10&timezone=Australia%2FPerth');
                if (!weatherRes.ok) throw new Error('Weather forecast unavailable');
                const weatherJson = await weatherRes.json();

                let nextForecastData = {
                    ...weatherJson.hourly
                };

                try {
                    const marineRes = await window.fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-32.007&longitude=115.51&hourly=swell_wave_height&forecast_days=10&timezone=Australia%2FPerth');
                    if (marineRes.ok) {
                        const marineJson = await marineRes.json();
                        nextForecastData = {
                            ...nextForecastData,
                            swell_wave_height: marineJson.hourly.swell_wave_height
                        };
                    } else {
                        loadError = 'Marine swell data is unavailable. Recommendations are lower confidence.';
                    }
                } catch (error) {
                    loadError = 'Marine swell data is unavailable. Recommendations are lower confidence.';
                }

                const nextAppData = {
                    beaches: nextBeaches,
                    landmarks: nextLandmarks,
                    facilities: nextFacilities,
                    forecastData: nextForecastData
                };

                applyAppData(nextAppData);
                writeForecastCache(localStorage, nextAppData);
            } catch (error) {
                console.error('Error loading data:', error);
                loadError = 'Forecast data is unavailable. Beach recommendations are low confidence.';
            } finally {
                loading = false;
            }
        }

        const cachedAppData = readForecastCache(localStorage);
        if (!forecastData?.time?.length) applyCachedAppData(cachedAppData);

        loadAppData();

        return () => {
            window.removeEventListener('resize', updateMapLayout);
            window.removeEventListener('orientationchange', updateMapLayout);
        };
    });

    applyInitialSharedState();

    function applyInitialSharedState() {
        if (beaches.length || landmarks.length || facilities.length) {
            applySharedLocationState({ beaches, landmarks, facilities, forecastData });
        }
    }

    const currentConditions = $derived(getConditions(forecastData, hourIndex));
    const selectedForecastTime = $derived(formatCompactTime(forecastData?.time?.[hourIndex], { weekday: true }));
    const recommendations = $derived(buildRecommendations(beaches, forecastData, hourIndex));
    const visibleRecommendations = $derived(filterRecommendations(recommendations, filters, mapZoom));
    const selectedRecommendation = $derived(
        recommendations.find((item) => item.beach.name === selectedBeachName) || null
    );
    const isBeachView = $derived(Boolean(selectedBeachName && selectedRecommendation));
    const mapRecommendations = $derived(filters.showBeaches === false ? [] : recommendations);
    const hasLoadedForecast = $derived(!loading && Boolean(forecastData?.time?.length));
    const safetyNotices = $derived([
        ...getSafetyNotices({
            windSpeed: currentConditions.windSpeed,
            swellHeight: currentConditions.swellHeight,
            precipitation: currentConditions.precipitation,
            forecastData
        }),
        ...(loadError ? [loadError] : [])
    ]);
    const selectedMapPlaceDistanceLabel = $derived(
        Number.isFinite(userLocation?.lat)
            && Number.isFinite(userLocation?.lon)
            && Number.isFinite(selectedMapPlace?.lat)
            && Number.isFinite(selectedMapPlace?.lon)
            ? formatDistanceLabel(getDistanceKm(userLocation.lat, userLocation.lon, selectedMapPlace.lat, selectedMapPlace.lon))
            : selectedMapPlace?.distanceLabel || ''
    );
    const selectedMapPlaceImages = $derived(getPlaceImages(selectedMapPlace?.name));
    const routeDistanceKm = $derived(getRouteDistanceKm(routePoints));
    const routeDistanceLabel = $derived(getRouteDistanceLabel(routeDistanceKm));
    const routeSocialName = $derived(routePoints.length >= 2 ? routeName.trim() : '');
    const routePlannerStatus = $derived(
        routePoints.length > 1
            ? routeDistanceLabel
            : routePoints.length === 1
                ? 'Add another point'
                : 'Click the map to start'
    );
    const pinCoordinateLabel = $derived(formatCoordinateLabel(droppedPin));
    const googleMapsPinUrl = $derived(buildGoogleMapsCoordinateUrl(droppedPin));
    const googleMapsRouteUrl = $derived(buildGoogleMapsRouteUrl(routePoints));
    const shareSucceeded = $derived(shareStatus === 'Link copied');
    const selectedSocialLocationName = $derived(selectedRecommendation?.beach?.name || selectedMapPlace?.name || '');
    const selectedSocialImage = $derived(
        selectedMapPlace
            ? getPrimaryPlaceImage(selectedMapPlace)
            : getBeachImages(selectedRecommendation?.beach?.name)[0]
    );
    const planningSocialImage = $derived(getPlanningSocialImage({
        routePoints,
        pin: droppedPin,
        beaches,
        places: [...landmarks, ...facilities],
        getImageUrl: (location) => beaches.includes(location)
            ? getBeachImages(location.name)[0]?.src
            : getPrimaryPlaceImage(location)?.src
    }));
    const currentSocialMeta = $derived(buildSocialMeta({
        locationName: selectedSocialLocationName,
        routeName: routeSocialName,
        routeDistanceLabel,
        routePoints,
        pin: droppedPin,
        pinCoordinateLabel,
        selectedTime: selectedForecastTime,
        recommendedBeachCount: getRecommendedBeachCount(recommendations),
        conditions: currentConditions,
        url: currentShareUrl,
        imageUrl: planningSocialImage || selectedSocialImage?.src,
        imageDetails: getBeachSocialImageDetails(selectedMapPlace ? null : selectedRecommendation?.beach)
    }));

    $effect(() => {
        if (!selectedMapPlace || !mapNavigationRequest || mapNavigationRequest.name !== selectedMapPlace.name) return;
        if (!selectedMapPlaceDistanceLabel || mapNavigationRequest.distanceLabel === selectedMapPlaceDistanceLabel) return;

        mapNavigationRequest = {
            ...mapNavigationRequest,
            distanceLabel: selectedMapPlaceDistanceLabel
        };
    });

    $effect(() => {
        const selectedName = selectedBeachName || selectedMapPlace?.name || '';
        const selectedHour = hourIndex;
        const plannedRoute = routePoints.length;
        const plannedRouteName = routeName;
        const plannedPin = droppedPin?.lat;
        updateShareUrl();
    });

</script>

<svelte:head>
    <title>{currentSocialMeta.title}</title>
    <meta name="description" content={currentSocialMeta.description} />
    <meta property="og:title" content={currentSocialMeta.title} />
    <meta property="og:description" content={currentSocialMeta.description} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Rottnest Weather" />
    <meta property="og:url" content={currentSocialMeta.url} />
    <meta property="og:image" content={currentSocialMeta.image} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content={currentSocialMeta.imageAlt} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={currentSocialMeta.title} />
    <meta name="twitter:description" content={currentSocialMeta.description} />
    <meta name="twitter:image" content={currentSocialMeta.image} />
    <meta name="twitter:image:alt" content={currentSocialMeta.imageAlt} />
</svelte:head>

<Header
    windDirDeg={currentConditions.windDirectionDegrees}
    windSpeed={currentConditions.windSpeed}
    windDir={currentConditions.windDirection}
    temp={currentConditions.temperature}
    swellHeight={currentConditions.swellHeight}
    rainAmount={currentConditions.precipitation}
    {selectedForecastTime}
    {loading}
/>

<main>
    {#if shareStatus}
        <div class="share-toast" aria-live="polite">{shareStatus}</div>
    {/if}
    <Map
        recommendations={$state.snapshot(mapRecommendations)}
        landmarks={$state.snapshot(landmarks)}
        facilities={$state.snapshot(facilities)}
        {filters}
        selectedBeachName={selectedRecommendation?.beach.name}
        hasExplicitBeachSelection={Boolean(selectedBeachName || selectedMapPlace)}
        {panelMode}
        {mapLayout}
        {mapNavigationRequest}
        routeMode={routeMode}
        routePoints={$state.snapshot(routePoints)}
        {droppedPin}
        onSelectBeach={revealBeachInPanel}
        onNavigateToMap={navigateToMapTarget}
        onPlanningPoint={handleMapPlanningPoint}
        onZoomChange={(zoom) => mapZoom = zoom}
        onUserLocationChange={(location) => userLocation = location}
    />
    <MapSearch
        beaches={$state.snapshot(beaches)}
        landmarks={$state.snapshot(landmarks)}
        facilities={$state.snapshot(facilities)}
        {panelMode}
        {mapLayout}
        {userLocation}
        onSelectBeach={selectSearchBeach}
        onNavigateToMap={navigateToMapTarget}
    />
    <section class="route-planner" aria-label="Route and pin sharing">
        <div class="route-planner-actions">
            <button
                type="button"
                class:active={routeMode === 'route'}
                aria-pressed={routeMode === 'route'}
                aria-label="Start route planning"
                title="Route"
                onclick={startRoutePlanning}
            >
                <span class="route-planner-icon route-planner-icon-route" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M6 18 C6 13 18 13 18 6" />
                        <circle cx="6" cy="18" r="2.4" />
                        <circle cx="18" cy="6" r="2.4" />
                    </svg>
                </span>
            </button>
            <button
                type="button"
                class:active={routeMode === 'pin'}
                aria-pressed={routeMode === 'pin'}
                aria-label="Drop a pin"
                title="Pin"
                onclick={startPinDrop}
            >
                <span class="route-planner-icon route-planner-icon-pin" aria-hidden="true">⌖</span>
            </button>
        </div>
        {#if routeMode !== 'pin' && (routeMode === 'route' || routePoints.length)}
            {#if !routePlannerExpanded && routeMode === 'off'}
                <button
                    type="button"
                    class="route-planner-summary"
                    aria-label="Show route details"
                    aria-expanded="false"
                    onclick={() => routePlannerExpanded = true}
                >
                    <span>
                        <strong>{routePlannerStatus}</strong>
                        <small>{routePoints.length} waypoint{routePoints.length === 1 ? '' : 's'}</small>
                    </span>
                    <span class="route-planner-summary-chevron" aria-hidden="true">⌄</span>
                </button>
            {:else}
            <div class="route-planner-card">
                <div class="route-planner-card-header">
                    <span>
                        <strong>{routePlannerStatus}</strong>
                        <small>{routePoints.length} waypoint{routePoints.length === 1 ? '' : 's'}</small>
                    </span>
                    {#if routeMode === 'off' && routePoints.length}
                        <button
                            type="button"
                            class="route-planner-collapse"
                            aria-label="Collapse route details"
                            onclick={() => routePlannerExpanded = false}
                        >⌃</button>
                    {/if}
                </div>
                <label class="route-name-field">
                    <span>Route name</span>
                    <input
                        type="text"
                        placeholder="Name this route"
                        maxlength="80"
                        bind:value={routeName}
                    />
                </label>
                <div class="route-planner-card-actions">
                    <button type="button" onclick={undoRoutePoint} disabled={!routePoints.length}>Undo</button>
                    <button type="button" onclick={clearRoute} disabled={!routePoints.length && routeMode !== 'route'}>Clear</button>
                    {#if googleMapsRouteUrl}
                        <a class="google-maps-action" href={googleMapsRouteUrl} target="_blank" rel="noreferrer">
                            <img class="google-maps-icon" src="/google-maps-icon.png" alt="Google Maps" loading="lazy" />
                            Open route
                        </a>
                    {/if}
                    <button type="button" class:copied={shareSucceeded} onclick={() => shareCurrentLocation()} disabled={routePoints.length < 2}>
                        {shareSucceeded ? 'Copied' : 'Share'}
                    </button>
                </div>
            </div>
            {/if}
        {/if}
    </section>
    {#if droppedPin}
        <aside class="dropped-pin-card" aria-label="Dropped pin">
            <button type="button" class="dropped-pin-close" aria-label="Close dropped pin" onclick={clearDroppedPin}>×</button>
            <div>
                <small>Pinned location</small>
                <strong>{pinCoordinateLabel}</strong>
                <span>
                    <a class="google-maps-action" href={googleMapsPinUrl} target="_blank" rel="noreferrer">
                        <img class="google-maps-icon" src="/google-maps-icon.png" alt="Google Maps" loading="lazy" />
                        Open in Google Maps
                    </a>
                    <button type="button" class:copied={shareSucceeded} onclick={() => shareCurrentLocation()}>
                        {shareSucceeded ? 'Copied' : 'Share'}
                    </button>
                </span>
            </div>
        </aside>
    {/if}
    {#if selectedMapPlace}
        <aside class="selected-map-place-card" class:has-images={selectedMapPlaceImages.length} aria-label="Selected map place">
            <button type="button" class="selected-map-place-close" aria-label="Close selected place" onclick={clearSelectedMapPlace}>×</button>
            {#if selectedMapPlaceImages.length}
                <div class="selected-map-place-image-strip" aria-label="{selectedMapPlace.name} photos">
                    {#each selectedMapPlaceImages as image (image.src)}
                        <img
                            class="selected-map-place-image"
                            src={image.src}
                            alt={image.alt}
                            loading="lazy"
                        />
                    {/each}
                </div>
            {/if}
            <div class="selected-map-place-content">
                <small>{selectedMapPlace.label || selectedMapPlace.type || 'Place'}</small>
                <strong>
                    {selectedMapPlace.name}
                    <button class="selected-map-place-share" class:copied={shareSucceeded} type="button" aria-label="Share {selectedMapPlace.name}" onclick={() => shareCurrentLocation()}>
                        {shareSucceeded ? '✓' : '🔗'}
                    </button>
                </strong>
                {#if selectedMapPlace.ratingLabel || selectedMapPlaceDistanceLabel}
                    <span class="selected-map-place-meta">
                        {#if selectedMapPlace.ratingLabel}
                            <span class="selected-map-place-rating">{selectedMapPlace.ratingLabel}</span>
                        {/if}
                        {#if selectedMapPlaceDistanceLabel}
                            <span class="selected-map-place-distance">{selectedMapPlaceDistanceLabel}</span>
                        {/if}
                    </span>
                {/if}
            </div>
        </aside>
    {/if}
    {#if hasLoadedForecast}
        <RecommendationPanel
            {beaches}
            recommendations={$state.snapshot(recommendations)}
            landmarks={$state.snapshot(landmarks)}
            facilities={$state.snapshot(facilities)}
            selectedRecommendation={$state.snapshot(selectedRecommendation)}
            safetyNotices={$state.snapshot(safetyNotices)}
            forecastData={$state.snapshot(forecastData)}
            {userLocation}
            bind:hourIndex
            bind:panelMode
            {filters}
            {mapLayout}
            {panelOpenRequest}
            {panelScrollRequest}
            onSelectBeach={selectBeach}
            isBeachView={isBeachView}
            onCloseBeach={clearSelectedBeach}
            shareUrl={currentShareUrl}
            shareSucceeded={shareSucceeded}
            onShareLocation={shareCurrentLocation}
            onStateFilterChange={updateStateFilter}
            onToggleFilter={updateLayerFilter}
            onNavigateToMap={navigateToMapTarget}
        />
    {/if}
</main>

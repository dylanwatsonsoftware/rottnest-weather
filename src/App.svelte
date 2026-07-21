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

    let beaches = $state([]);
    let landmarks = $state([]);
    let facilities = $state([]);
    let forecastData = $state(null);
    let hourIndex = $state(0);
    let loading = $state(true);
    let loadError = $state('');
    let mapZoom = $state(12);
    let selectedBeachName = $state('');
    let panelMode = $state('closed');
    let panelOpenRequest = $state(0);
    let panelScrollRequest = $state(0);
    let mapNavigationRequest = $state(null);
    let selectedMapPlace = $state(null);
    let userLocation = $state(null);
    let sharedLocationState = $state({ locationKey: '', time: '' });
    let currentShareUrl = $state('');
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
        showAllWhenZoomedOut: false,
        minimumScore: 0,
        includeLeastBad: false
    });

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

    function navigateToMapTarget(target) {
        if (!target) return;
        mapNavigationSequence += 1;
        const isMapPlace = isMapPlaceTarget(target);
        if (isMapPlace) {
            selectedBeachName = '';
        }
        selectedMapPlace = isMapPlace ? target : null;
        mapNavigationRequest = {
            ...target,
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
        } else if (sharedLocationState.time) {
            return;
        } else {
            didApplySharedLocationState = true;
        }

        const parsedLocation = parseSharedLocationKey(sharedLocationState.locationKey);
        if (!parsedLocation) return;

        if (parsedLocation.kind === 'beach') {
            const beach = findSharedPlace(appData.beaches, parsedLocation);
            if (!beach) return;

            selectedMapPlace = null;
            selectedBeachName = beach.name;
            panelMode = 'open';
            panelOpenRequest += 1;
            const target = getBeachSelectionMapTarget(beach, 'open', mapLayout);
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
        if (typeof window === 'undefined' || !forecastData?.time?.length) return;
        if (hasPendingSharedTime()) return;

        const locationKey = selectedMapPlace
            ? getLocationKey(selectedMapPlace)
            : getLocationKey({ type: 'beach', name: selectedBeachName });
        const nextUrl = buildShareUrl(window.location.href, {
            locationKey,
            time: forecastData.time[hourIndex]
        });

        currentShareUrl = nextUrl;
        if (window.location.href !== nextUrl) {
            history.replaceState(history.state, '', nextUrl);
        }
    }

    async function shareCurrentLocation() {
        if (!currentShareUrl) updateShareUrl();
        const url = currentShareUrl || window.location.href;
        await navigator.clipboard?.writeText(url);
        return url;
    }

    function getSelectedMapPlaceLinks(place = selectedMapPlace) {
        const links = [];
        const addLink = (url, label) => {
            if (!url || links.some((link) => link.url === url)) return;
            links.push({ url, label });
        };

        addLink(place?.source_url, 'Source');
        addLink(place?.coordinate_source_url, 'Coordinate source');
        return links;
    }

    function selectSearchBeach(name) {
        revealBeachInPanel(name);
    }

    function revealBeachInPanel(name) {
        selectBeach(name, 'open');
        panelOpenRequest += 1;
        panelScrollRequest += 1;
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
        const currentSelectedTime = forecastData?.time?.[hourIndex];
        beaches = nextAppData.beaches;
        landmarks = nextAppData.landmarks;
        facilities = nextAppData.facilities;
        forecastData = nextAppData.forecastData;
        hourIndex = getAppDataHourIndex(nextAppData.forecastData, currentSelectedTime);
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
        sharedLocationState = getSharedLocationFromUrl(window.location.href);

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

                const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m&forecast_days=10');
                if (!weatherRes.ok) throw new Error('Weather forecast unavailable');
                const weatherJson = await weatherRes.json();

                let nextForecastData = {
                    ...weatherJson.hourly
                };

                try {
                    const marineRes = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-32.007&longitude=115.51&hourly=swell_wave_height&forecast_days=10');
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
        applyCachedAppData(cachedAppData);

        loadAppData();

        return () => {
            window.removeEventListener('resize', updateMapLayout);
            window.removeEventListener('orientationchange', updateMapLayout);
        };
    });

    const currentConditions = $derived(getConditions(forecastData, hourIndex));
    const selectedForecastTime = $derived(formatCompactTime(forecastData?.time?.[hourIndex], { weekday: true }));
    const recommendations = $derived(buildRecommendations(beaches, forecastData, hourIndex));
    const visibleRecommendations = $derived(filterRecommendations(recommendations, filters, mapZoom));
    const selectedRecommendation = $derived(
        recommendations.find((item) => item.beach.name === selectedBeachName) || null
    );
    const isBeachView = $derived(Boolean(selectedBeachName && selectedRecommendation));
    const mapRecommendations = $derived(
        selectedRecommendation && !visibleRecommendations.some((item) => item.beach.name === selectedRecommendation?.beach.name)
            ? [...visibleRecommendations, selectedRecommendation]
            : visibleRecommendations
    );
    const hasLoadedForecast = $derived(!loading && Boolean(forecastData?.time?.length));
    const safetyNotices = $derived([
        ...getSafetyNotices({
            windSpeed: currentConditions.windSpeed,
            swellHeight: currentConditions.swellHeight,
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
        updateShareUrl();
    });

</script>

<Header
    windDirDeg={currentConditions.windDirectionDegrees}
    windSpeed={currentConditions.windSpeed}
    windDir={currentConditions.windDirection}
    temp={currentConditions.temperature}
    swellHeight={currentConditions.swellHeight}
    {selectedForecastTime}
    {loading}
/>

<main>
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
        onSelectBeach={revealBeachInPanel}
        onNavigateToMap={navigateToMapTarget}
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
    {#if selectedMapPlace}
        {@const selectedMapPlaceLinks = getSelectedMapPlaceLinks(selectedMapPlace)}
        <aside class="selected-map-place-card" aria-label="Selected map place">
            <button type="button" class="selected-map-place-close" aria-label="Close selected place" onclick={clearSelectedMapPlace}>×</button>
            <div>
                <small>{selectedMapPlace.label || selectedMapPlace.type || 'Place'}</small>
                <strong>
                    {selectedMapPlace.name}
                    <button class="selected-map-place-share" type="button" aria-label="Share {selectedMapPlace.name}" onclick={() => shareCurrentLocation()}>🔗</button>
                </strong>
                <span>
                    {[selectedMapPlaceDistanceLabel, selectedMapPlace.ratingLabel].filter(Boolean).join(' · ')}
                </span>
                {#if selectedMapPlaceLinks.length}
                    <nav class="selected-map-place-links" aria-label="{selectedMapPlace.name} source links">
                        {#each selectedMapPlaceLinks as link}
                            <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
                        {/each}
                    </nav>
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
            onShareLocation={shareCurrentLocation}
            onStateFilterChange={updateStateFilter}
            onToggleFilter={updateLayerFilter}
            onNavigateToMap={navigateToMapTarget}
        />
    {/if}
</main>

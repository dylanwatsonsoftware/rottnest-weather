<script>
    import { onMount } from 'svelte';
    import Header from './lib/Header.svelte';
    import Map from './lib/Map.svelte';
    import RecommendationPanel from './lib/RecommendationPanel.svelte';
    import {
        buildRecommendations,
        filterRecommendations,
        getConditions,
        getSafetyNotices
    } from './lib/recommendations.js';
    import { mergeFacilityEnrichment } from './lib/facilities.js';
    import { getBeachSelectionMapTarget, getMapLayout, getMapLayoutChangeTarget } from './lib/mapFocus.js';
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
    let activeTab = $state('best');
    let panelMode = $state('collapsed');
    let panelOpenRequest = $state(0);
    let mapNavigationRequest = $state(null);
    let mapNavigationSequence = 0;
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
        showFacilities: false,
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
        mapNavigationRequest = {
            ...target,
            requestId: mapNavigationSequence
        };

        if (target.type === 'landmark') {
            filters = {
                ...filters,
                showLandmarks: true
            };
        }

        if (target.type === 'facility') {
            filters = {
                ...filters,
                showFacilities: true
            };
        }
    }

    function selectBeach(name, targetPanelMode = panelMode) {
        selectedBeachName = name;
        const beach = beaches.find((item) => item.name === name);
        const target = getBeachSelectionMapTarget(beach, targetPanelMode, mapLayout);
        if (target) navigateToMapTarget(target);
    }

    function selectTopRecommendation(name) {
        selectBeach(name, 'expanded');
        activeTab = 'best';
        panelOpenRequest += 1;
    }

    onMount(() => {
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

                beaches = await beachesRes.json();
                landmarks = await landmarksRes.json();
                facilities = mergeFacilityEnrichment(await facilitiesRes.json(), await enrichmentRes.json());

                const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m&forecast_days=10');
                if (!weatherRes.ok) throw new Error('Weather forecast unavailable');
                const weatherJson = await weatherRes.json();

                forecastData = {
                    ...weatherJson.hourly
                };

                try {
                    const marineRes = await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-32.007&longitude=115.51&hourly=swell_wave_height&forecast_days=10');
                    if (marineRes.ok) {
                        const marineJson = await marineRes.json();
                        forecastData = {
                            ...forecastData,
                            swell_wave_height: marineJson.hourly.swell_wave_height
                        };
                    } else {
                        loadError = 'Marine swell data is unavailable. Recommendations are lower confidence.';
                    }
                } catch (error) {
                    loadError = 'Marine swell data is unavailable. Recommendations are lower confidence.';
                }

                const now = new Date();
                let minDiff = Infinity;
                forecastData.time.forEach((t, i) => {
                    const diff = Math.abs(new Date(t) - now);
                    if (diff < minDiff) {
                        minDiff = diff;
                        hourIndex = i;
                    }
                });
            } catch (error) {
                console.error('Error loading data:', error);
                loadError = 'Forecast data is unavailable. Beach recommendations are low confidence.';
            } finally {
                loading = false;
            }
        }

        loadAppData();

        return () => {
            window.removeEventListener('resize', updateMapLayout);
            window.removeEventListener('orientationchange', updateMapLayout);
        };
    });

    const currentConditions = $derived(getConditions(forecastData, hourIndex));
    const recommendations = $derived(buildRecommendations(beaches, forecastData, hourIndex));
    const visibleRecommendations = $derived(filterRecommendations(recommendations, filters, mapZoom));
    const selectedRecommendation = $derived(
        recommendations.find((item) => item.beach.name === selectedBeachName) || recommendations[0] || null
    );
    const safetyNotices = $derived([
        ...getSafetyNotices({
            windSpeed: currentConditions.windSpeed,
            swellHeight: currentConditions.swellHeight,
            forecastData
        }),
        ...(loadError ? [loadError] : [])
    ]);

</script>

<Header
    windDirDeg={currentConditions.windDirectionDegrees}
    windSpeed={currentConditions.windSpeed}
    windDir={currentConditions.windDirection}
    temp={currentConditions.temperature}
    swellHeight={currentConditions.swellHeight}
    topRecommendation={recommendations[0]}
    onTopRecommendationSelect={selectTopRecommendation}
    {loading}
/>

<main>
    <Map
        recommendations={$state.snapshot(visibleRecommendations)}
        landmarks={$state.snapshot(landmarks)}
        facilities={$state.snapshot(facilities)}
        {filters}
        selectedBeachName={selectedRecommendation?.beach.name}
        hasExplicitBeachSelection={Boolean(selectedBeachName)}
        {panelMode}
        {mapLayout}
        {mapNavigationRequest}
        onSelectBeach={(name) => {
            selectBeach(name, 'expanded');
            activeTab = 'best';
            panelOpenRequest += 1;
        }}
        onZoomChange={(zoom) => mapZoom = zoom}
    />
    <RecommendationPanel
        {beaches}
        recommendations={$state.snapshot(recommendations)}
        landmarks={$state.snapshot(landmarks)}
        facilities={$state.snapshot(facilities)}
        selectedRecommendation={$state.snapshot(selectedRecommendation)}
        safetyNotices={$state.snapshot(safetyNotices)}
        forecastData={$state.snapshot(forecastData)}
        bind:hourIndex
        bind:panelMode
        {filters}
        {activeTab}
        {mapLayout}
        {panelOpenRequest}
        onSelectBeach={selectBeach}
        onTabChange={(tab) => activeTab = tab}
        onStateFilterChange={updateStateFilter}
        onToggleFilter={updateLayerFilter}
        onNavigateToMap={navigateToMapTarget}
    />
</main>

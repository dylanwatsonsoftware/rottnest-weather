<script>
    import Controls from './Controls.svelte';
    import {
        getDefaultPanelMode,
        getForecastRange,
        getNextPanelMode,
        getPanelModeAfterOpenRequest,
        getRangeModeLabel,
        RANGE_MODES,
        shouldShowConfidenceLabel
    } from './panelState.js';
    import { formatTime, RECOMMENDATION_STATES } from './recommendations.js';
    import { getMapNavigationTarget } from './mapFocus.js';

    let {
        recommendations = [],
        landmarks = [],
        selectedRecommendation = null,
        safetyNotices = [],
        forecastData = null,
        hourIndex = $bindable(0),
        filters,
        activeTab = 'best',
        panelOpenRequest = 0,
        onSelectBeach = () => {},
        onTabChange = () => {},
        onStateFilterChange = () => {},
        onToggleFilter = () => {},
        onNavigateToMap = () => {}
    } = $props();

    const stateLabels = {
        best: 'Best',
        good: 'Good',
        watch: 'Watch',
        avoid: 'Avoid'
    };

    const stateText = {
        best: 'Best now',
        good: 'Good',
        watch: 'Watch',
        avoid: 'Avoid'
    };

    const bestNow = $derived(recommendations.filter((item) => item.state === 'best' || item.state === 'good').slice(0, 6));
    const later = $derived(recommendations.filter((item) => item.nextGood).slice(0, 8));
    const nearbyLandmarks = $derived(getNearbyLandmarks(selectedRecommendation?.beach, landmarks));
    let panelMode = $state(getDefaultPanelMode());
    let lastHandledOpenRequest = $state(0);
    let rangeMode = $state('today');
    const isCollapsed = $derived(panelMode === 'collapsed');
    const forecastRange = $derived(getForecastRange(forecastData, rangeMode));
    const selectedTime = $derived(forecastData ? formatTime(forecastData.time[hourIndex]) : 'Now');

    function getNearbyLandmarks(beach, allLandmarks) {
        if (!beach?.lat || !beach?.lon) return [];
        return allLandmarks
            .map((landmark) => ({
                ...landmark,
                distanceKm: getDistanceKm(beach.lat, beach.lon, landmark.lat, landmark.lon)
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 3);
    }

    function getDistanceKm(lat1, lon1, lat2, lon2) {
        const radius = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2
            + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
        return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function toRadians(value) {
        return value * Math.PI / 180;
    }

    function navigatePlaceToMap(place) {
        const target = getMapNavigationTarget(place);
        if (!target) return;
        onNavigateToMap({
            ...target,
            type: place.type
        });
    }

    $effect(() => {
        panelMode = getPanelModeAfterOpenRequest(panelMode, panelOpenRequest, lastHandledOpenRequest);
        lastHandledOpenRequest = panelOpenRequest;
    });

    $effect(() => {
        const range = forecastRange;
        if (hourIndex < range.min) hourIndex = range.min;
        if (hourIndex > range.max) hourIndex = range.max;
    });
</script>

<section class="recommendation-panel" class:collapsed={isCollapsed} aria-label="Snorkelling recommendations">
    <button
        class="panel-collapse-toggle"
        type="button"
        aria-expanded={!isCollapsed}
        aria-controls="recommendation-panel-content"
        onclick={() => panelMode = getNextPanelMode(panelMode)}
    >
        <span class="sheet-handle" aria-hidden="true"></span>
        <span>{isCollapsed ? 'Show recommendations' : 'Map view'}</span>
    </button>

    {#if isCollapsed && forecastData}
        <div class="collapsed-time-control" aria-label="Forecast time control">
            <div class="range-mode-toggle" aria-label="Forecast range">
                {#each RANGE_MODES as mode}
                    <button
                        type="button"
                        class:active={rangeMode === mode}
                        onclick={() => rangeMode = mode}
                    >
                        {getRangeModeLabel(mode)}
                    </button>
                {/each}
            </div>
            <label for="collapsed-time-slider">{selectedTime}</label>
            <input
                type="range"
                id="collapsed-time-slider"
                min={forecastRange.min}
                aria-valuemin={forecastRange.min}
                aria-valuemax={forecastRange.max}
                max={forecastRange.max}
                bind:value={hourIndex}
            />
        </div>
    {/if}

    <div id="recommendation-panel-content" class="panel-body" hidden={isCollapsed}>
    <div class="panel-tabs" role="tablist" aria-label="Recommendation views">
        <button class:active={activeTab === 'best'} onclick={() => onTabChange('best')} type="button">Best Now</button>
        <button class:active={activeTab === 'later'} onclick={() => onTabChange('later')} type="button">Later</button>
        <button class:active={activeTab === 'filters'} onclick={() => onTabChange('filters')} type="button">Filters</button>
    </div>

    {#if safetyNotices.length}
        <div class="safety-strip">
            {#each safetyNotices as notice}
                <p>{notice}</p>
            {/each}
        </div>
    {/if}

    <div class="panel-content">
        {#if activeTab === 'best'}
            <div class="recommendation-list">
                {#each bestNow as item}
                    <button class="recommendation-row {item.state}" class:selected={selectedRecommendation?.beach.name === item.beach.name} type="button" onclick={() => onSelectBeach(item.beach.name)}>
                        <span class="score">{item.score}</span>
                        <span class="row-main">
                            <strong>{item.beach.name}</strong>
                            <small>{item.summary}</small>
                        </span>
                        <span class="state-pill {item.state}">{stateText[item.state]}</span>
                    </button>
                {:else}
                    <p class="empty-state">No beaches look clearly good right now. Try the Later tab or broaden filters.</p>
                {/each}
            </div>
        {:else if activeTab === 'later'}
            <div class="recommendation-list">
                {#each later as item}
                    <button class="recommendation-row later-row" type="button" onclick={() => {
                        onSelectBeach(item.beach.name);
                        hourIndex = item.nextGood.hourIndex;
                    }}>
                        <span class="score">{item.nextGood.score}</span>
                        <span class="row-main">
                            <strong>{item.beach.name}</strong>
                            <small>{formatTime(item.nextGood.time)} · {item.nextGood.windSpeed} km/h {item.nextGood.windDirection}</small>
                        </span>
                        <span class="state-pill {item.nextGood.state}">{stateText[item.nextGood.state]}</span>
                    </button>
                {:else}
                    <p class="empty-state">No better snorkeling windows found in this forecast.</p>
                {/each}
            </div>
        {:else}
            <div class="filters-grid">
                <div class="filter-group">
                    <h2>Beach States</h2>
                    <div class="chip-row">
                        {#each RECOMMENDATION_STATES as state}
                            <label class="filter-chip {state}">
                                <input
                                    type="checkbox"
                                    checked={filters.states[state]}
                                    onchange={(event) => onStateFilterChange(state, event.currentTarget.checked)}
                                />
                                <span>{stateLabels[state]}</span>
                            </label>
                        {/each}
                    </div>
                </div>

                <div class="filter-group">
                    <h2>Map Layers</h2>
                    <label class="toggle-row">
                        <input type="checkbox" checked={filters.showBeaches} onchange={(event) => onToggleFilter('showBeaches', event.currentTarget.checked)} />
                        <span>Beaches</span>
                    </label>
                    <label class="toggle-row">
                        <input type="checkbox" checked={filters.showLandmarks} onchange={(event) => onToggleFilter('showLandmarks', event.currentTarget.checked)} />
                        <span>Landmarks</span>
                    </label>
                    <label class="toggle-row">
                        <input type="checkbox" checked={filters.showBusinesses} onchange={(event) => onToggleFilter('showBusinesses', event.currentTarget.checked)} />
                        <span>Facilities</span>
                    </label>
                    <label class="toggle-row">
                        <input type="checkbox" checked={filters.showUserLocation} onchange={(event) => onToggleFilter('showUserLocation', event.currentTarget.checked)} />
                        <span>My location</span>
                    </label>
                    <label class="toggle-row">
                        <input type="checkbox" checked={filters.showAllWhenZoomedOut} onchange={(event) => onToggleFilter('showAllWhenZoomedOut', event.currentTarget.checked)} />
                        <span>Show all beaches when zoomed out</span>
                    </label>
                </div>
            </div>
        {/if}

        {#if selectedRecommendation}
            <article class="beach-detail {selectedRecommendation.state}">
                <div class="detail-heading">
                    <p class="eyebrow">{selectedRecommendation.summary}</p>
                    <h2>{selectedRecommendation.beach.name}</h2>
                    <button
                        class="map-jump-button"
                        type="button"
                        aria-label="Show {selectedRecommendation.beach.name} on map"
                        title="Show on map"
                        onclick={() => navigatePlaceToMap(selectedRecommendation.beach)}
                    >
                        ⌖
                    </button>
                </div>
                <div class="detail-metrics">
                    <span>{selectedRecommendation.conditions.windSpeed ?? 'N/A'} km/h {selectedRecommendation.conditions.windDirection}</span>
                    <span>{selectedRecommendation.conditions.swellHeight ?? 'N/A'}m swell</span>
                    {#if shouldShowConfidenceLabel(selectedRecommendation.confidence)}
                        <span>{selectedRecommendation.confidence} confidence</span>
                    {/if}
                </div>
                <ul>
                    {#each selectedRecommendation.reasons.slice(0, 3) as reason}
                        <li>{reason}</li>
                    {/each}
                </ul>
                <p class="detail-note">Good winds: {selectedRecommendation.beach.ok_winds.join(', ')}</p>
                {#if selectedRecommendation.beach.difficulty}
                    <p class="detail-note">{selectedRecommendation.beach.difficulty}</p>
                {/if}
                {#if selectedRecommendation.beach.access}
                    <p class="detail-note">{selectedRecommendation.beach.access}</p>
                {/if}
                {#if selectedRecommendation.nextGood}
                    <p class="detail-note">Next good window: {formatTime(selectedRecommendation.nextGood.time)}</p>
                {/if}
                {#if nearbyLandmarks.length}
                    <div class="nearby-list">
                        <strong>Nearby</strong>
                        {#each nearbyLandmarks as landmark}
                            <button type="button" onclick={() => navigatePlaceToMap(landmark)}>
                                <span>{landmark.name}</span>
                                <small>{landmark.distanceKm.toFixed(1)} km</small>
                            </button>
                        {/each}
                    </div>
                {/if}
            </article>
        {/if}

        {#if forecastData}
            <Controls
                {forecastData}
                {forecastRange}
                {rangeMode}
                onRangeModeChange={(mode) => rangeMode = mode}
                bind:hourIndex
            />
        {/if}
    </div>
    </div>
</section>

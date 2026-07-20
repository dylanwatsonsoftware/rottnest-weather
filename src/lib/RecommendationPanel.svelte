<script>
    import Controls from './Controls.svelte';
    import {
        getDefaultPanelMode,
        getForecastRange,
        getLaterTabHourIndex,
        getNextPanelMode,
        getPanelModeAfterOpenRequest,
        getRangeModeLabel,
        getRangeModeForHourIndex,
        getSliderHeatGradient,
        getTimelineScrollLeft,
        RANGE_MODES,
        shouldShowConfidenceLabel
    } from './panelState.js';
    import { getFacilityIcon, getNearbyFacilities } from './facilities.js';
    import { getBeachImages } from './beachMedia.js';
    import { buildBeachStatusTimeline, buildBestBeachTimeline, formatTime, getBeachDetailNotes, RECOMMENDATION_STATES } from './recommendations.js';
    import { getMapNavigationTarget, getPanelModeMapOffset } from './mapFocus.js';

    let {
        recommendations = [],
        beaches = [],
        landmarks = [],
        facilities = [],
        selectedRecommendation = null,
        safetyNotices = [],
        forecastData = null,
        hourIndex = $bindable(0),
        panelMode = $bindable(getDefaultPanelMode()),
        filters,
        activeTab = 'best',
        mapLayout = 'default',
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

    const laterStateText = {
        best: 'Best later',
        good: 'Good later',
        watch: 'Watch later',
        avoid: 'Avoid later'
    };

    const bestNow = $derived(recommendations.filter((item) => item.state === 'best' || item.state === 'good').slice(0, 6));
    const later = $derived(recommendations.filter((item) => item.nextGood).slice(0, 8));
    const nearbyPlaces = $derived(getNearbyPlaces(selectedRecommendation?.beach, landmarks, facilities));
    let lastHandledOpenRequest = $state(0);
    let rangeMode = $state('today');
    let timelineChartElement = $state(null);
    let timelineCellElements = new Map();
    let selectedPhoto = $state(null);
    const isCollapsed = $derived(panelMode === 'collapsed');
    const forecastRange = $derived(getForecastRange(forecastData, rangeMode));
    const selectedTime = $derived(forecastData ? formatTime(forecastData.time[hourIndex]) : 'Now');
    const bestBeachTimeline = $derived(buildBestBeachTimeline(beaches, forecastData, forecastRange));
    const sliderHeatGradient = $derived(getSliderHeatGradient(bestBeachTimeline, forecastRange));
    const beachTimeline = $derived(buildBeachStatusTimeline(selectedRecommendation?.beach, forecastData, forecastRange));
    const beachDetailNotes = $derived(getBeachDetailNotes(selectedRecommendation?.beach));
    const selectedBeachImages = $derived(getBeachImages(selectedRecommendation?.beach.name));

    function getNearbyLandmarks(beach, allLandmarks) {
        if (!beach?.lat || !beach?.lon) return [];
        return allLandmarks
            .map((landmark) => ({
                ...landmark,
                distanceKm: getDistanceKm(beach.lat, beach.lon, landmark.lat, landmark.lon),
                label: landmark.subtype === 'lighthouse' ? 'Lighthouse' : 'Landmark',
                icon: landmark.subtype === 'lighthouse' ? '🗼' : '📍'
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 2);
    }

    function getNearbyPlaces(beach, allLandmarks, allFacilities) {
        return [
            ...getNearbyFacilities(beach, allFacilities, 5),
            ...getNearbyLandmarks(beach, allLandmarks)
        ]
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, 6);
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
        const target = getMapNavigationTarget(place, 15, getPanelModeMapOffset(panelMode, mapLayout));
        if (!target) return;
        onNavigateToMap({
            ...target,
            type: place.type
        });
    }

    function bindTimelineCell(element, hour) {
        if (element) {
            timelineCellElements.set(hour, element);
        }

        return {
            destroy() {
                timelineCellElements.delete(hour);
            }
        };
    }

    function syncTimelineScroll() {
        const activeCell = timelineCellElements.get(hourIndex);
        if (!timelineChartElement || !activeCell) return;
        const activeRect = activeCell.getBoundingClientRect();
        const chartRect = timelineChartElement.getBoundingClientRect();

        timelineChartElement.scrollTo({
            left: getTimelineScrollLeft({
                activeLeft: activeRect.left - chartRect.left,
                activeWidth: activeRect.width,
                containerWidth: timelineChartElement.clientWidth,
                currentScrollLeft: timelineChartElement.scrollLeft,
                maxScrollLeft: timelineChartElement.scrollWidth - timelineChartElement.clientWidth
            }),
            behavior: 'smooth'
        });
    }

    function selectTab(tab) {
        onTabChange(tab);
        if (tab !== 'later') return;

        const laterHourIndex = getLaterTabHourIndex(recommendations, hourIndex, forecastData);
        rangeMode = getRangeModeForHourIndex(forecastData, laterHourIndex);
        hourIndex = laterHourIndex;
    }

    $effect(() => {
        panelMode = getPanelModeAfterOpenRequest(panelMode, panelOpenRequest, lastHandledOpenRequest);
        lastHandledOpenRequest = panelOpenRequest;
    });

    $effect(() => {
        const selectedBeachName = selectedRecommendation?.beach.name;
        selectedPhoto = null;
    });

    $effect(() => {
        const range = forecastRange;
        if (hourIndex < range.min) hourIndex = range.min;
        if (hourIndex > range.max) hourIndex = range.max;
    });

    $effect(() => {
        const currentHourIndex = hourIndex;
        const timelineCount = beachTimeline.length;
        requestAnimationFrame(syncTimelineScroll);
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
                style:--slider-heat={sliderHeatGradient}
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
        <button class:active={activeTab === 'best'} onclick={() => selectTab('best')} type="button">Best Now</button>
        <button class:active={activeTab === 'later'} onclick={() => selectTab('later')} type="button">Good Later</button>
        <button class:active={activeTab === 'filters'} onclick={() => selectTab('filters')} type="button">Filters</button>
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
                        <span class="state-pill {item.nextGood.state}">{laterStateText[item.nextGood.state]}</span>
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
                    <h2>Rejection</h2>
                    <div class="score-filter-control">
                        <label for="minimum-score-filter">
                            Minimum score
                            <strong>{filters.minimumScore ?? 0}</strong>
                        </label>
                        <input
                            id="minimum-score-filter"
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={filters.minimumScore ?? 0}
                            oninput={(event) => onToggleFilter('minimumScore', Number(event.currentTarget.value))}
                        />
                    </div>
                    <label class="toggle-row">
                        <input type="checkbox" checked={filters.includeLeastBad} onchange={(event) => onToggleFilter('includeLeastBad', event.currentTarget.checked)} />
                        <span>Show least-bad avoided beaches</span>
                    </label>
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
                        <input type="checkbox" checked={filters.showFacilities} onchange={(event) => onToggleFilter('showFacilities', event.currentTarget.checked)} />
                        <span>Food & facilities</span>
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
                {#key selectedRecommendation.beach.name}
                    {#if selectedBeachImages.length}
                        <div class="beach-photo-strip" aria-label="{selectedRecommendation.beach.name} photos">
                            {#each selectedBeachImages as image (image.src)}
                                <figure>
                                    <button
                                        class="beach-photo-button"
                                        type="button"
                                        aria-label="Open larger photo of {selectedRecommendation.beach.name}"
                                        onclick={() => selectedPhoto = image}
                                    >
                                        <img src={image.src} alt={image.alt} loading="lazy" />
                                    </button>
                                    <figcaption>
                                        <a href={image.sourceUrl} target="_blank" rel="noreferrer">{image.author}</a>
                                        <span>{image.license}</span>
                                    </figcaption>
                                </figure>
                            {/each}
                        </div>
                    {/if}
                {/key}
                {#if beachTimeline.length}
                    <div class="status-timeline" aria-label="{selectedRecommendation.beach.name} status over selected time range">
                        <div class="detail-time-control">
                            <label for="detail-time-slider">
                                Forecast time
                                <strong>{selectedTime}</strong>
                            </label>
                            <input
                                type="range"
                                id="detail-time-slider"
                                style:--slider-heat={sliderHeatGradient}
                                min={forecastRange.min}
                                max={forecastRange.max}
                                bind:value={hourIndex}
                            />
                        </div>
                        <div class="timeline-heading">
                            <strong>Score by time</strong>
                            <span>{getRangeModeLabel(rangeMode)}</span>
                        </div>
                        <div class="timeline-chart" bind:this={timelineChartElement}>
                            {#each beachTimeline as item}
                                <button
                                    type="button"
                                    use:bindTimelineCell={item.hourIndex}
                                    class="timeline-cell {item.state}"
                                    class:active={item.hourIndex === hourIndex}
                                    title="{item.label}: {item.summary}"
                                    aria-label="{item.label}: {item.summary}"
                                    onclick={() => hourIndex = item.hourIndex}
                                >
                                    <span>{item.score}</span>
                                </button>
                            {/each}
                        </div>
                        <div class="timeline-labels">
                            <span>{beachTimeline[0].label}</span>
                            <span>{beachTimeline[beachTimeline.length - 1].label}</span>
                        </div>
                    </div>
                {/if}
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
                {#each beachDetailNotes as note}
                    <p class="detail-note">{note}</p>
                {/each}
                {#if selectedRecommendation.nextGood}
                    <p class="detail-note">Next good window: {formatTime(selectedRecommendation.nextGood.time)}</p>
                {/if}
                {#if nearbyPlaces.length}
                    <div class="nearby-list">
                        <strong>Nearby</strong>
                        {#each nearbyPlaces as place}
                            <button type="button" onclick={() => navigatePlaceToMap(place)}>
                                <span>
                                    <small aria-hidden="true">{place.icon || getFacilityIcon(place.category)}</small>
                                    {place.name}
                                </span>
                                <small>
                                    {#if Number.isFinite(place.rating)}
                                        {place.rating} ★ ·
                                    {/if}
                                    {place.label ? `${place.label} · ` : ''}{place.distanceKm.toFixed(1)} km
                                </small>
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
                {sliderHeatGradient}
                onRangeModeChange={(mode) => rangeMode = mode}
                bind:hourIndex
            />
        {/if}
    </div>
    </div>

    {#if selectedPhoto}
        <div class="beach-photo-modal" role="dialog" aria-modal="true" aria-label="Larger beach photo">
            <button class="beach-photo-modal-backdrop" type="button" aria-label="Close larger photo" onclick={() => selectedPhoto = null}></button>
            <figure class="beach-photo-modal-content">
                <img class="beach-photo-modal-image" src={selectedPhoto.src} alt={selectedPhoto.alt} />
                <button class="beach-photo-modal-close" type="button" onclick={() => selectedPhoto = null}>Close</button>
                <figcaption>
                    <span>{selectedPhoto.alt}</span>
                    <a href={selectedPhoto.sourceUrl} target="_blank" rel="noreferrer">{selectedPhoto.author}</a>
                    <span>{selectedPhoto.license}</span>
                </figcaption>
            </figure>
        </div>
    {/if}
</section>

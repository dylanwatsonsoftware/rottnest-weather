<script>
    import { tick } from 'svelte';
    import { buildPlaceSearchIndex, searchPlaces } from './placeSearch.js';
    import { getMapNavigationTarget, getPanelModeMapOffset } from './mapFocus.js';

    let {
        beaches = [],
        landmarks = [],
        facilities = [],
        panelMode = 'collapsed',
        mapLayout = 'default',
        userLocation = null,
        onSelectBeach = () => {},
        onNavigateToMap = () => {}
    } = $props();

    let query = $state('');
    let isOpen = $state(false);
    let searchInput = $state(null);
    const searchIndex = $derived(buildPlaceSearchIndex({ beaches, landmarks, facilities }));
    const results = $derived(searchPlaces(searchIndex, query, 8, userLocation));
    const hasQuery = $derived(query.trim().length > 0);

    async function openSearch() {
        isOpen = true;
        await tick();
        searchInput?.focus();
    }

    function clearSearch() {
        query = '';
        isOpen = false;
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            clearSearch();
        }
    }

    function selectResult(result) {
        if (result.kind === 'beach') {
            onSelectBeach(result.name);
        } else {
            const target = getMapNavigationTarget(
                result,
                15,
                getPanelModeMapOffset(panelMode, mapLayout)
            );
            if (target) {
                onNavigateToMap({
                    ...target,
                    type: result.kind,
                    distanceKm: result.distanceKm,
                    distanceLabel: result.distanceLabel
                });
            }
        }

        clearSearch();
    }
</script>

<section class="map-search" class:open={isOpen} aria-label="Search map places">
    {#if isOpen}
        <div class="map-search-input-wrap">
            <span class="map-search-icon" aria-hidden="true">⌕</span>
            <input
                bind:this={searchInput}
                type="search"
                placeholder="Search beaches or places"
                aria-label="Search beaches or places"
                bind:value={query}
                onkeydown={handleKeydown}
            />
            <button class="map-search-clear" type="button" aria-label="Clear search" onclick={clearSearch}>×</button>
        </div>
    {:else}
        <button class="map-search-toggle" type="button" aria-label="Open map search" onclick={openSearch}>
            <span aria-hidden="true">⌕</span>
        </button>
    {/if}

    {#if isOpen && hasQuery}
        <div class="map-search-results" aria-label="Search results">
            {#each results as result (`${result.kind}-${result.name}`)}
                <button
                    type="button"
                    class="map-search-result"
                    onclick={() => selectResult(result)}
                >
                    <span class="map-search-result-icon" aria-hidden="true">{result.icon}</span>
                    <span>
                        <strong>{result.name}</strong>
                        <small>{result.distanceLabel ? `${result.label} · ${result.distanceLabel}` : result.label}</small>
                    </span>
                </button>
            {:else}
                <p class="map-search-empty">No matching places</p>
            {/each}
        </div>
    {/if}
</section>

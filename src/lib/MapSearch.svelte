<script>
    import { buildPlaceSearchIndex, searchPlaces } from './placeSearch.js';
    import { getMapNavigationTarget, getPanelModeMapOffset } from './mapFocus.js';

    let {
        beaches = [],
        landmarks = [],
        facilities = [],
        panelMode = 'collapsed',
        mapLayout = 'default',
        onSelectBeach = () => {},
        onNavigateToMap = () => {}
    } = $props();

    let query = $state('');
    let isOpen = $state(false);
    const searchIndex = $derived(buildPlaceSearchIndex({ beaches, landmarks, facilities }));
    const results = $derived(searchPlaces(searchIndex, query, 8));
    const hasQuery = $derived(query.trim().length > 0);

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
                    type: result.kind
                });
            }
        }

        clearSearch();
    }
</script>

<section class="map-search" aria-label="Search map places">
    <div class="map-search-input-wrap">
        <span class="map-search-icon" aria-hidden="true">⌕</span>
        <input
            type="search"
            placeholder="Search beaches or places"
            aria-label="Search beaches or places"
            bind:value={query}
            onfocus={() => isOpen = true}
            onkeydown={handleKeydown}
        />
        {#if hasQuery}
            <button class="map-search-clear" type="button" aria-label="Clear search" onclick={clearSearch}>×</button>
        {/if}
    </div>

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
                        <small>{result.label}</small>
                    </span>
                </button>
            {:else}
                <p class="map-search-empty">No matching places</p>
            {/each}
        </div>
    {/if}
</section>

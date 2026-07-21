<script>
    import Logo from './Logo.svelte';
    let {
        windDirDeg = 0,
        windSpeed,
        windDir = 'N',
        temp,
        swellHeight,
        selectedForecastTime = '',
        loading = false,
    } = $props();
</script>

<header>
    <div class="logo-container">
        <Logo size={40} class="header-logo" />
        <h1>Rottnest Weather</h1>
    </div>
    <div id="weather-panel">
        {#if loading}
            <div id="weather-info">
                <p>Loading weather data...</p>
            </div>
        {:else}
            <div id="wind-arrow-container">
                <svg id="wind-arrow" viewBox="0 0 24 24" style="transform: rotate({windDirDeg + 180}deg)">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
            </div>
            <div id="weather-info">
                <div><strong>Wind:</strong> {windSpeed ?? 'N/A'} km/h {windDir}</div>
                <div><strong>Temp:</strong> {temp ?? 'N/A'} °C</div>
                <div><strong>Swell:</strong> {swellHeight ?? 'N/A'}m</div>
                {#if selectedForecastTime}
                    <div class="forecast-time-chip"><strong>Time:</strong> {selectedForecastTime}</div>
                {/if}
            </div>
        {/if}
    </div>
</header>

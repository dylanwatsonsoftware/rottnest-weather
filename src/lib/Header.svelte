<script>
    let { windDirDeg, windSpeed, windDir, temp, swellHeight, loading = false } = $props();
</script>

<header>
    <h1>Rottnest Snorkelling</h1>
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
                <div><strong>Wind:</strong> {windSpeed} km/h {windDir}</div>
                <div><strong>Temp:</strong> {temp} °C</div>
                <div><strong>Swell:</strong> {swellHeight}m</div>
            </div>
        {/if}
    </div>
</header>

<script>
    import { onMount } from 'svelte';
    import Header from './lib/Header.svelte';
    import Map from './lib/Map.svelte';
    import Controls from './lib/Controls.svelte';
    import Footer from './lib/Footer.svelte';
    import './app.css';

    let beaches = $state([]);
    let landmarks = $state([]);
    let forecastData = $state(null);
    let hourIndex = $state(0);
    let loading = $state(true);

    function getDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    onMount(async () => {
        try {
            const [beachesRes, landmarksRes, weatherRes, marineRes] = await Promise.all([
                fetch('/beaches.json'),
                fetch('/landmarks.json'),
                fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m&forecast_days=2'),
                fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-32.007&longitude=115.51&hourly=swell_wave_height&forecast_days=2')
            ]);

            beaches = await beachesRes.json();
            landmarks = await landmarksRes.json();
            const weatherJson = await weatherRes.json();
            const marineJson = await marineRes.json();

            forecastData = {
                ...weatherJson.hourly,
                swell_wave_height: marineJson.hourly.swell_wave_height
            };

            // Set initial hour index to closest current hour
            const now = new Date();
            let minDiff = Infinity;
            forecastData.time.forEach((t, i) => {
                const diff = Math.abs(new Date(t) - now);
                if (diff < minDiff) {
                    minDiff = diff;
                    hourIndex = i;
                }
            });

            loading = false;
        } catch (error) {
            console.error('Error loading data:', error);
        }
    });

    const currentWindDirDeg = $derived(forecastData ? forecastData.winddirection_10m[hourIndex] : 0);
    const currentWindSpeed = $derived(forecastData ? forecastData.windspeed_10m[hourIndex] : 0);
    const currentWindDir = $derived(forecastData ? getDirection(currentWindDirDeg) : 'N');
    const currentTemp = $derived(forecastData ? forecastData.temperature_2m[hourIndex] : 0);
    const currentSwellHeight = $derived(forecastData ? (forecastData.swell_wave_height ? forecastData.swell_wave_height[hourIndex] : 'N/A') : 'N/A');

</script>

<Header
    windDirDeg={currentWindDirDeg}
    windSpeed={currentWindSpeed}
    windDir={currentWindDir}
    temp={currentTemp}
    swellHeight={currentSwellHeight}
    {loading}
/>

<main>
    <Map beaches={$state.snapshot(beaches)} landmarks={$state.snapshot(landmarks)} windDir={currentWindDir} />
    {#if forecastData}
        <Controls forecastData={$state.snapshot(forecastData)} bind:hourIndex />
    {/if}
</main>

<Footer />

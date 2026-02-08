document.addEventListener('DOMContentLoaded', async () => {
    const weatherPanel = document.getElementById('weather-panel');
    const selectedTimeLabel = document.getElementById('selected-time');
    const timeSlider = document.getElementById('time-slider');
    const map = L.map('map').setView([-32.007, 115.51], 13);
    let chart;
    let forecastData = null;
    let beachMarkers = [];
    let beaches = [];

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    function getDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    function updateBeaches(hourIndex) {
        if (!forecastData || !beaches.length) return;

        const windDirDeg = forecastData.winddirection_10m[hourIndex];
        const windSpeed = forecastData.windspeed_10m[hourIndex];
        const temp = forecastData.temperature_2m[hourIndex];
        const time = new Date(forecastData.time[hourIndex]).toLocaleString();
        const windDir = getDirection(windDirDeg);

        selectedTimeLabel.textContent = time;
        weatherPanel.innerHTML = `
            <strong>Selected Wind:</strong> ${windSpeed} km/h from ${windDir} (${windDirDeg}°)
            <br>
            <strong>Temp:</strong> ${temp} °C
        `;

        beachMarkers.forEach(m => map.removeLayer(m));
        beachMarkers = [];

        beaches.forEach(beach => {
            if (beach.lat && beach.lon) {
                const isOk = beach.ok_winds.includes(windDir);
                let icon;
                if (isOk) {
                    icon = L.divIcon({
                        className: 'ok-marker',
                        html: '<div class="tick-icon">✔</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                } else {
                    icon = L.divIcon({
                        className: 'not-ok-marker',
                        html: '<div style="color: grey; font-size: 12px;">●</div>',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    });
                }

                const marker = L.marker([beach.lat, beach.lon], { icon })
                    .bindPopup(`<strong>${beach.name}</strong><br>Status: ${isOk ? 'OK' : 'Unsuitable'}<br>OK Winds: ${beach.ok_winds.join(', ')}`)
                    .addTo(map);
                beachMarkers.push(marker);
            }
        });

        // Update chart vertical line
        if (chart && chart.options.plugins.annotation.annotations.line1) {
            chart.options.plugins.annotation.annotations.line1.xMin = hourIndex;
            chart.options.plugins.annotation.annotations.line1.xMax = hourIndex;
            chart.update();
        }
    }

    try {
        const [beachesResponse, weatherResponse] = await Promise.all([
            fetch('beaches.json'),
            fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m&forecast_days=2')
        ]);

        beaches = await beachesResponse.json();
        const weatherJson = await weatherResponse.json();
        forecastData = weatherJson.hourly;

        // Initialize Chart
        const ctx = document.getElementById('windChart').getContext('2d');

        // We need the annotation plugin for the vertical line, but let's see if we can do without or add it.
        // I'll add the script for annotation plugin in index.html if needed,
        // but let's try a simpler way: just update the chart's background or similar if possible.
        // Actually, I'll just add the annotation plugin script.

        const labels = forecastData.time.map(t => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Wind Speed (km/h)',
                    data: forecastData.windspeed_10m,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    annotation: { // Will work if plugin is loaded
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: 0,
                                xMax: 0,
                                borderColor: 'red',
                                borderWidth: 2,
                            }
                        }
                    }
                }
            }
        });

        // Add event listener for slider
        timeSlider.addEventListener('input', (e) => {
            updateBeaches(parseInt(e.target.value));
        });

        // Initial update for current hour
        const now = new Date();
        let closestIndex = 0;
        let minDiff = Infinity;
        forecastData.time.forEach((t, i) => {
            const diff = Math.abs(new Date(t) - now);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        });

        timeSlider.value = closestIndex;
        updateBeaches(closestIndex);

    } catch (error) {
        console.error('Error loading data:', error);
        weatherPanel.innerHTML = '<p>Error loading weather data.</p>';
    }
});

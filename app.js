document.addEventListener('DOMContentLoaded', async () => {
    const weatherPanel = document.getElementById('weather-panel');
    const map = L.map('map').setView([-32.007, 115.51], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    function getDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    try {
        const [beachesResponse, weatherResponse] = await Promise.all([
            fetch('beaches.json'),
            fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&current_weather=true')
        ]);

        const beaches = await beachesResponse.json();
        const weatherData = await weatherResponse.json();
        const current = weatherData.current_weather;
        const windDir = getDirection(current.winddirection);

        weatherPanel.innerHTML = `
            <strong>Current Wind:</strong> ${current.windspeed} km/h from ${windDir} (${current.winddirection}°)
            <br>
            <strong>Temp:</strong> ${current.temperature} °C
        `;

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
                    // Standard marker for not OK or just empty?
                    // The request says "showing each of the beaches with a green tick on the map for each of the beaches that are Ok"
                    // It doesn't explicitly say what to show if NOT ok.
                    // I'll show a small grey dot or just nothing.
                    // Let's show a small grey circle for better visibility of all beaches.
                    icon = L.divIcon({
                        className: 'not-ok-marker',
                        html: '<div style="color: grey; font-size: 12px;">●</div>',
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    });
                }

                L.marker([beach.lat, beach.lon], { icon })
                    .bindPopup(`<strong>${beach.name}</strong><br>Status: ${isOk ? 'OK' : 'Unsuitable'}<br>OK Winds: ${beach.ok_winds.join(', ')}`)
                    .addTo(map);
            }
        });

    } catch (error) {
        console.error('Error loading data:', error);
        weatherPanel.innerHTML = '<p>Error loading weather data.</p>';
    }
});

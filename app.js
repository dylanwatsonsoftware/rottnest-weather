document.addEventListener('DOMContentLoaded', async () => {
    // Register the datalabels plugin
    Chart.register(ChartDataLabels);

    const weatherPanel = document.getElementById('weather-panel');
    const weatherInfo = document.getElementById('weather-info');
    const windArrow = document.getElementById('wind-arrow');
    const selectedTimeLabel = document.getElementById('selected-time');
    const timeSlider = document.getElementById('time-slider');
    const map = L.map('map').setView([-32.007, 115.51], 12);
    let chart;
    let forecastData = null;
    let beachMarkers = [];
    let userLocationMarker = null;
    let userLocationCircle = null;
    let beaches = [];

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
    }).addTo(map);

    function getDirection(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    function getWindArrow(degrees) {
        // Arrows pointing WHERE the wind is blowing
        // e.g. 0 deg = North (blowing South) -> ↓
        const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
        const index = Math.round(degrees / 45) % 8;
        return arrows[index];
    }

    function updateBeaches(hourIndex, animateChart = true) {
        if (!forecastData || !beaches.length) return;

        const windDirDeg = forecastData.winddirection_10m[hourIndex];
        const windSpeed = forecastData.windspeed_10m[hourIndex];
        const temp = forecastData.temperature_2m[hourIndex];
        const time = new Date(forecastData.time[hourIndex]).toLocaleString([], {
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
        const windDir = getDirection(windDirDeg);

        selectedTimeLabel.textContent = time;

        // Update arrow rotation (pointing TO where the wind is blowing)
        if (windArrow) {
            windArrow.style.transform = `rotate(${windDirDeg + 180}deg)`;
        }

        const swellHeight = forecastData.swell_wave_height ? forecastData.swell_wave_height[hourIndex] : 'N/A';

        if (weatherInfo) {
            weatherInfo.innerHTML = `
                <div><strong>Wind:</strong> ${windSpeed} km/h ${windDir}</div>
                <div><strong>Temp:</strong> ${temp} °C</div>
                <div><strong>Swell:</strong> ${swellHeight}m</div>
            `;
        }

        beachMarkers.forEach(mObj => {
            const { marker, beach } = mObj;
            const isOk = beach.ok_winds.includes(windDir);

            const icon = L.divIcon({
                className: `beach-marker ${isOk ? 'ok' : 'not-ok'}`,
                html: `<div>${isOk ? '🤿' : '✖'}</div>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            marker.setIcon(icon);
            marker.getPopup().setContent(`<strong>${beach.name}</strong><br>Status: ${isOk ? 'OK' : 'Unsuitable'}<br>OK Winds: ${beach.ok_winds.join(', ')}`);
        });

        // Update chart vertical line
        if (chart && chart.options.plugins.annotation.annotations.line1) {
            chart.options.plugins.annotation.annotations.line1.xMin = hourIndex;
            chart.options.plugins.annotation.annotations.line1.xMax = hourIndex;
            chart.update(animateChart ? undefined : 'none');
        }
    }

    try {
        const [beachesResponse, landmarksResponse, weatherResponse, marineResponse] = await Promise.all([
            fetch('beaches.json'),
            fetch('landmarks.json'),
            fetch('https://api.open-meteo.com/v1/forecast?latitude=-32.007&longitude=115.51&hourly=temperature_2m,windspeed_10m,winddirection_10m&forecast_days=2'),
            fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-32.007&longitude=115.51&hourly=swell_wave_height&forecast_days=2')
        ]);

        beaches = await beachesResponse.json();
        const landmarks = await landmarksResponse.json();
        const weatherJson = await weatherResponse.json();
        const marineJson = await marineResponse.json();

        forecastData = {
            ...weatherJson.hourly,
            swell_wave_height: marineJson.hourly.swell_wave_height
        };

        // Initialize Beach Markers
        beaches.forEach(beach => {
            if (beach.lat && beach.lon) {
                const marker = L.marker([beach.lat, beach.lon], {
                    icon: L.divIcon({className: 'beach-marker'}) // placeholder
                })
                .bindPopup('')
                .bindTooltip(beach.name, {
                    permanent: true,
                    direction: 'top',
                    className: 'beach-label',
                    offset: [0, -10]
                })
                .addTo(map);
                beachMarkers.push({ marker, beach });
            }
        });

        // Initialize Chart
        const ctx = document.getElementById('windChart').getContext('2d');

        const labels = forecastData.time.map(t => new Date(t).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Wind Speed (km/h)',
                        data: forecastData.windspeed_10m,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y',
                        datalabels: {
                            display: function(context) {
                                return context.dataIndex % 4 === 0; // Show every 4 hours to avoid clutter
                            },
                            formatter: function(value, context) {
                                return getWindArrow(forecastData.winddirection_10m[context.dataIndex]);
                            },
                            align: 'top',
                            offset: 5,
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            color: '#0056b3'
                        }
                    },
                    {
                        label: 'Swell Height (m)',
                        data: forecastData.swell_wave_height,
                        borderColor: '#28a745',
                        backgroundColor: 'transparent',
                        fill: false,
                        tension: 0.4,
                        yAxisID: 'y1',
                        datalabels: {
                            display: false
                        }
                    }
                ]
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
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Wind (km/h)',
                            font: { size: 10 },
                            color: '#007bff'
                        },
                        ticks: {
                            color: '#007bff'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false
                        },
                        title: {
                            display: true,
                            text: 'Swell (m)',
                            font: { size: 10 },
                            color: '#28a745'
                        },
                        ticks: {
                            color: '#28a745'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                    if (context.datasetIndex === 0) { // Wind Speed
                                        const dir = getDirection(forecastData.winddirection_10m[context.dataIndex]);
                                        const arrow = getWindArrow(forecastData.winddirection_10m[context.dataIndex]);
                                        label += ' km/h ' + dir + ' ' + arrow;
                                    } else {
                                        label += 'm';
                                    }
                                }
                                return label;
                            }
                        }
                    },
                    annotation: {
                        annotations: {
                            line1: {
                                type: 'line',
                                xMin: 0,
                                xMax: 0,
                                borderColor: 'red',
                                borderWidth: 2,
                            }
                        }
                    },
                    datalabels: {
                        // Default for all datasets is false, overridden in wind speed dataset
                        display: false
                    }
                }
            }
        });

        // Add event listener for slider
        timeSlider.addEventListener('input', (e) => {
            updateBeaches(parseInt(e.target.value), false);
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

        // Add landmarks to map
        landmarks.forEach(landmark => {
            let iconEmoji = landmark.type === 'business' ? '🏪' : '📍';
            if (landmark.subtype === 'lighthouse') iconEmoji = '🗼';

            const icon = L.divIcon({
                className: 'landmark-marker',
                html: `<div class="landmark-icon ${landmark.type}">${iconEmoji}</div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([landmark.lat, landmark.lon], { icon })
                .bindPopup(`<strong>${landmark.name}</strong><br>Type: ${landmark.type}`)
                .addTo(map);
        });

        // User Location Tracking
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-dot"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        map.on('locationfound', (e) => {
            if (userLocationMarker) {
                userLocationMarker.setLatLng(e.latlng);
            } else {
                userLocationMarker = L.marker(e.latlng, { icon: userIcon }).addTo(map)
                    .bindPopup("You are here");
            }

            if (userLocationCircle) {
                userLocationCircle.setLatLng(e.latlng);
                userLocationCircle.setRadius(e.accuracy / 2);
            } else {
                userLocationCircle = L.circle(e.latlng, {
                    radius: e.accuracy / 2,
                    color: '#007bff',
                    fillColor: '#007bff',
                    fillOpacity: 0.1,
                    weight: 1
                }).addTo(map);
            }
        });

        map.on('locationerror', (e) => {
            console.warn("Location access denied or unavailable.");
        });

        // Trigger automatic geolocation
        map.locate({setView: false, watch: true});

    } catch (error) {
        console.error('Error loading data:', error);
        if (weatherPanel) weatherPanel.innerHTML = '<p>Error loading weather data.</p>';
    }
});

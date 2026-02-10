<script>
    import { onMount } from 'svelte';
    import L from 'leaflet';
    import 'leaflet/dist/leaflet.css';

    let { beaches = [], landmarks = [], windDir = 'N' } = $props();

    let map;
    let mapElement;
    let beachMarkers = [];
    let landmarkMarkers = [];

    onMount(() => {
        map = L.map(mapElement).setView([-32.007, 115.51], 12);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
        }).addTo(map);

        initUserLocation();

        return () => {
            map.remove();
        };
    });

    function initLandmarks() {
        // Clear existing landmarks
        landmarkMarkers.forEach(m => m.remove());
        landmarkMarkers = [];

        landmarks.forEach(landmark => {
            let iconEmoji = landmark.type === 'business' ? '🏪' : '📍';
            if (landmark.subtype === 'lighthouse') iconEmoji = '🗼';

            const icon = L.divIcon({
                className: `landmark-icon ${landmark.type} ${landmark.subtype || ''}`,
                html: `<span>${iconEmoji}</span>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            const marker = L.marker([landmark.lat, landmark.lon], { icon })
                .bindPopup(`<strong>${landmark.name}</strong><br>Type: ${landmark.type}`)
                .addTo(map);
            landmarkMarkers.push(marker);
        });
    }

    function initBeaches() {
        // Clear existing markers
        beachMarkers.forEach(mObj => mObj.marker.remove());
        beachMarkers = [];

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
        updateBeaches();
    }

    function updateBeaches() {
        if (!map || !beachMarkers.length) return;
        beachMarkers.forEach(mObj => {
            const { marker, beach } = mObj;
            const isOk = beach.ok_winds.includes(windDir);

            const icon = L.divIcon({
                className: `beach-marker ${isOk ? 'ok' : 'not-ok'}`,
                html: `<span>${isOk ? '🤿' : '✖'}</span>`,
                iconSize: [26, 26],
                iconAnchor: [13, 13]
            });

            marker.setIcon(icon);
            marker.getPopup().setContent(`<strong>${beach.name}</strong><br>Status: ${isOk ? 'OK' : 'Unsuitable'}<br>OK Winds: ${beach.ok_winds.join(', ')}`);
        });
    }

    function initUserLocation() {
        let userLocationMarker = null;
        let userLocationCircle = null;

        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-dot"></div>',
            iconSize: [20, 20], // Increased for better hit area and visibility
            iconAnchor: [10, 10]
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

        map.locate({setView: false, watch: true});
    }

    $effect(() => {
        if (map && beaches.length > 0) {
            initBeaches();
        }
    });

    $effect(() => {
        if (map && landmarks.length > 0) {
            initLandmarks();
        }
    });

    $effect(() => {
        // Track dependencies
        const currentWindDir = windDir;
        if (map && beachMarkers.length > 0) {
            updateBeaches();
        }
    });

</script>

<div id="map" bind:this={mapElement}></div>

<style>
    #map {
        height: 100%;
        width: 100%;
    }
</style>

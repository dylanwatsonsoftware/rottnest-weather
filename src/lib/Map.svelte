<script>
    import { onMount } from 'svelte';
    import L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import {
        getInitialFitSettings,
        getLandmarkFitPoints,
        getVisibleBeachFitPoints,
        getVisibleBeachFitSettings
    } from './mapFocus.js';

    let {
        recommendations = [],
        landmarks = [],
        filters = {},
        selectedBeachName = '',
        mapNavigationRequest = null,
        onSelectBeach = () => {},
        onZoomChange = () => {},
        onUserLocationChange = () => {}
    } = $props();

    let map;
    let mapElement;
    let beachMarkers = [];
    let landmarkMarkers = [];
    let userLocationMarker = null;
    let userLocationCircle = null;
    let currentZoom = $state(12);
    let didFitInitialFocus = false;
    let lastNavigationRequestId = null;
    let lastVisibleBeachFitSignature = '';

    const stateIcons = {
        best: '★',
        good: '✓',
        watch: '!',
        avoid: '×'
    };

    onMount(() => {
        map = L.map(mapElement).setView([-32.007, 115.51], 12);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
        }).addTo(map);

        initUserLocation();
        map.on('zoomend', () => {
            currentZoom = map.getZoom();
            onZoomChange(currentZoom);
            updateBeachLabels();
            updateLandmarks();
        });
        currentZoom = map.getZoom();
        onZoomChange(currentZoom);

        return () => {
            map.remove();
        };
    });

    function initLandmarks() {
        landmarkMarkers.forEach(m => m.remove());
        landmarkMarkers = [];

        landmarks.forEach(landmark => {
            if (!shouldShowLandmark(landmark)) return;

            let iconEmoji = landmark.type === 'business' ? '🏪' : '📍';
            if (landmark.subtype === 'lighthouse') iconEmoji = '🗼';

            const icon = L.divIcon({
                className: `landmark-icon ${landmark.type} ${landmark.subtype || ''}`,
                html: `<span>${iconEmoji}</span>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            const marker = L.marker([landmark.lat, landmark.lon], { icon })
                .bindPopup(`<strong>${escapeHtml(landmark.name)}</strong><br>Type: ${escapeHtml(landmark.type)}`)
                .addTo(map);
            landmarkMarkers.push(marker);
        });
    }

    function initBeaches() {
        beachMarkers.forEach(mObj => mObj.marker.remove());
        beachMarkers = [];

        recommendations.forEach(recommendation => {
            const beach = recommendation.beach;
            if (beach.lat && beach.lon) {
                const marker = L.marker([beach.lat, beach.lon], {
                    icon: getBeachIcon(recommendation)
                })
                .on('click', () => onSelectBeach(beach.name))
                .bindTooltip(beach.name, {
                    permanent: currentZoom > 11 || recommendation.state === 'best',
                    direction: 'top',
                    className: `beach-label ${recommendation.state}`,
                    offset: [0, -10]
                })
                .addTo(map);
                beachMarkers.push({ marker, recommendation });
            }
        });
        updateBeaches();
        fitVisibleBeaches();
    }

    function updateBeaches() {
        if (!map || !beachMarkers.length) return;
        beachMarkers.forEach(mObj => {
            const { marker, recommendation } = mObj;
            marker.setIcon(getBeachIcon(recommendation));
            marker.setZIndexOffset(recommendation.beach.name === selectedBeachName ? 900 : recommendation.score);
        });
        updateBeachLabels();
    }

    function initUserLocation() {
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
            onUserLocationChange({ lat: e.latlng.lat, lon: e.latlng.lng });
            updateUserLocationVisibility();
        });

        map.locate({setView: false, watch: true});
    }

    function getBeachIcon(recommendation) {
        const selected = recommendation.beach.name === selectedBeachName ? 'selected' : '';
        return L.divIcon({
            className: `beach-marker ${recommendation.state} ${selected}`,
            html: `<span>${stateIcons[recommendation.state]}</span><small>${recommendation.score}</small>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });
    }

    function updateBeachLabels() {
        beachMarkers.forEach(({ marker, recommendation }) => {
            const shouldShow = currentZoom > 11 || recommendation.state === 'best' || recommendation.beach.name === selectedBeachName;
            const tooltip = marker.getTooltip();
            if (!tooltip) return;

            if (shouldShow) {
                marker.openTooltip();
            } else {
                marker.closeTooltip();
            }
        });
    }

    function shouldShowLandmark(landmark) {
        if (landmark.type === 'business') {
            return filters.showBusinesses !== false && currentZoom > 12;
        }
        if (filters.showLandmarks === false) return false;
        return currentZoom > 10 || landmark.subtype === 'lighthouse';
    }

    function updateLandmarks() {
        if (map && landmarks.length > 0) {
            initLandmarks();
        }
    }

    function updateUserLocationVisibility() {
        const visible = filters.showUserLocation !== false;
        if (userLocationMarker) {
            if (visible && !map.hasLayer(userLocationMarker)) userLocationMarker.addTo(map);
            if (!visible && map.hasLayer(userLocationMarker)) userLocationMarker.remove();
        }
        if (userLocationCircle) {
            if (visible && !map.hasLayer(userLocationCircle)) userLocationCircle.addTo(map);
            if (!visible && map.hasLayer(userLocationCircle)) userLocationCircle.remove();
        }
    }

    function fitInitialFocus() {
        const fitPoints = getLandmarkFitPoints(landmarks);
        if (!map || didFitInitialFocus || !fitPoints.length) return;

        didFitInitialFocus = true;
        const fitSettings = getInitialFitSettings();
        const bounds = L.latLngBounds(fitPoints);
        map.fitBounds(bounds, fitSettings.fitBoundsOptions);
        if (fitSettings.minZoom && map.getZoom() < fitSettings.minZoom) {
            map.setView(bounds.getCenter(), fitSettings.minZoom, { animate: false });
        }
        currentZoom = map.getZoom();
        onZoomChange(currentZoom);
    }

    function fitVisibleBeaches() {
        const fitPoints = getVisibleBeachFitPoints(recommendations);
        const signature = fitPoints.map((point) => point.join(',')).join('|');
        if (!map || !fitPoints.length || signature === lastVisibleBeachFitSignature) return;

        lastVisibleBeachFitSignature = signature;
        const fitSettings = getVisibleBeachFitSettings();

        if (fitPoints.length === 1) {
            map.flyTo(fitPoints[0], fitSettings.singleBeachZoom, {
                animate: true,
                duration: 0.35
            });
        } else {
            const bounds = L.latLngBounds(fitPoints);
            map.flyToBounds(bounds, {
                ...fitSettings.fitBoundsOptions,
                animate: true,
                duration: 0.35
            });
        }

        currentZoom = map.getZoom();
        onZoomChange(currentZoom);
    }

    function navigateToMapRequest(request) {
        if (!map || !request || request.requestId === lastNavigationRequestId) return;
        if (!Number.isFinite(request.lat) || !Number.isFinite(request.lon)) return;

        lastNavigationRequestId = request.requestId;
        const zoom = request.zoom || 15;
        const center = getOffsetCenter(request, zoom);
        map.flyTo(center, zoom, {
            animate: true,
            duration: 0.45
        });
        currentZoom = map.getZoom();
        onZoomChange(currentZoom);
    }

    function getOffsetCenter(request, zoom) {
        const offset = request.offset || [0, 0];
        const targetPoint = map.project([request.lat, request.lon], zoom);
        const centerPoint = targetPoint.add(L.point(offset[0], offset[1]));
        return map.unproject(centerPoint, zoom);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    $effect(() => {
        if (map) {
            initBeaches();
        }
    });

    $effect(() => {
        if (map && landmarks.length > 0) {
            initLandmarks();
        }
    });

    $effect(() => {
        if (map && beachMarkers.length > 0) {
            updateBeaches();
        }
    });

    $effect(() => {
        const currentFilters = filters;
        if (map) {
            updateLandmarks();
            updateUserLocationVisibility();
        }
    });

    $effect(() => {
        const focusLandmarks = landmarks;
        if (map) {
            fitInitialFocus();
        }
    });

    $effect(() => {
        const request = mapNavigationRequest;
        if (map) {
            navigateToMapRequest(request);
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

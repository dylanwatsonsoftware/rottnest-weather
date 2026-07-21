<script>
    import { onMount } from 'svelte';
    import L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import {
        getInitialFitSettings,
        getLandmarkFitPoints,
        getNavigationSettleDelay,
        getPanelModePanOffset,
        getBeachMarkerSize,
        shouldShowBeachLabel,
        shouldShowPlaceMarker,
        shouldShowPlaceLabel,
        getVisibleMapAnchorOffset,
        getVisibleBeachFitReason,
        getVisibleBeachFitPoints,
        getVisibleBeachFitSettings
    } from './mapFocus.js';
    import { formatDistanceLabel, getFacilityRatingLabel, getFacilityTypeLabel } from './facilities.js';
    import { getPrimaryPlaceImage } from './placeMedia.js';
    import { isWithinRottnestBounds } from './recommendations.js';

    let {
        recommendations = [],
        landmarks = [],
        facilities = [],
        filters = {},
        selectedBeachName = '',
        hasExplicitBeachSelection = false,
        panelMode = 'closed',
        mapLayout = 'default',
        mapNavigationRequest = null,
        onSelectBeach = () => {},
        onZoomChange = () => {},
        onUserLocationChange = () => {}
    } = $props();

    let map;
    let mapElement;
    let beachMarkers = [];
    let beachQualityOverlays = [];
    let placeMarkers = [];
    let userLocationMarker = null;
    let userLocationCircle = null;
    let currentZoom = $state(12);
    let didFitInitialFocus = false;
    let lastNavigationRequestId = null;
    let lastVisibleBeachPointsSignature = '';
    let lastVisibleBeachPanelMode = 'closed';
    let lastVisibleBeachMapLayout = 'default';
    const selectedPlaceName = $derived(
        mapNavigationRequest?.type === 'landmark' || mapNavigationRequest?.type === 'facility' || mapNavigationRequest?.type === 'business'
            ? mapNavigationRequest.name
            : ''
    );
    const selectedPlaceDistanceLabel = $derived(
        mapNavigationRequest?.distanceLabel || (
            Number.isFinite(mapNavigationRequest?.distanceKm) ? formatDistanceLabel(mapNavigationRequest.distanceKm) : ''
        )
    );

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
            const nextZoom = map.getZoom();
            currentZoom = nextZoom;
            onZoomChange(currentZoom);
            updateBeachLabels();
            updateBeachQualityOverlay();
            updateLandmarks();
        });
        currentZoom = map.getZoom();
        onZoomChange(currentZoom);

        return () => {
            map.remove();
        };
    });

    function initLandmarks() {
        placeMarkers.forEach(({ marker }) => marker.remove());
        placeMarkers = [];

        [...landmarks, ...facilities].forEach(place => {
            if (!shouldShowPlace(place)) return;

            let iconEmoji = getPlaceIcon(place);
            const selected = place.name === selectedPlaceName ? 'selected' : '';

            const icon = L.divIcon({
                className: `landmark-icon ${place.type} ${place.category || place.subtype || ''} ${selected}`,
                html: `<span>${iconEmoji}</span>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14]
            });
            const marker = L.marker([place.lat, place.lon], { icon })
                .bindTooltip(getPlaceTooltipLabel(place), {
                    permanent: shouldShowPlaceLabel(place, currentZoom, selectedPlaceName),
                    direction: 'top',
                    className: `place-label ${place.type} ${selected}`,
                    offset: [0, -8]
                })
                .bindPopup(getPlacePopup(place))
                .addTo(map);
            if (selected) marker.setZIndexOffset(1000);
            placeMarkers.push({ marker, place });
        });
    }

    function initBeaches() {
        beachMarkers.forEach(mObj => mObj.marker.remove());
        beachMarkers = [];

        recommendations.forEach((recommendation, index) => {
            const beach = recommendation.beach;
            if (beach.lat && beach.lon) {
                const marker = L.marker([beach.lat, beach.lon], {
                    icon: getBeachIcon(recommendation, index)
                })
                .on('click', () => onSelectBeach(beach.name))
                .bindTooltip(beach.name, {
                    permanent: shouldShowBeachLabel(recommendation, currentZoom, selectedBeachName, index),
                    direction: 'top',
                    className: `beach-label ${recommendation.state}`,
                    offset: [0, -10]
                })
                .addTo(map);
                beachMarkers.push({ marker, recommendation, rank: index });
            }
        });
        updateBeaches();
        updateBeachQualityOverlay();
        fitVisibleBeaches();
    }

    function updateBeaches() {
        if (!map || !beachMarkers.length) return;
        beachMarkers.forEach(mObj => {
            const { marker, recommendation, rank } = mObj;
            marker.setIcon(getBeachIcon(recommendation, rank));
            marker.setZIndexOffset(recommendation.beach.name === selectedBeachName ? 900 : recommendation.score);
        });
        updateBeachLabels();
        updateBeachQualityOverlay();
    }

    function updateBeachQualityOverlay() {
        beachQualityOverlays.forEach((overlay) => overlay.remove());
        beachQualityOverlays = [];
        if (!map || !shouldShowGoodBeachOverlay(currentZoom)) return;

        recommendations
            .filter((recommendation) => recommendation.state === 'best' || recommendation.state === 'good')
            .filter((recommendation) => Number.isFinite(recommendation.beach?.lat) && Number.isFinite(recommendation.beach?.lon))
            .slice(0, 8)
            .forEach((recommendation) => {
                const color = recommendation.state === 'best' ? '#167a52' : '#2e8b86';
                const overlay = L.circleMarker([recommendation.beach.lat, recommendation.beach.lon], {
                    radius: recommendation.state === 'best' ? 28 : 22,
                    color,
                    fillColor: color,
                    fillOpacity: 0.22,
                    opacity: 0.82,
                    weight: 2,
                    interactive: false,
                    className: `good-beach-overlay ${recommendation.state}`
                }).addTo(map);
                beachQualityOverlays.push(overlay);
            });
    }

    function shouldShowGoodBeachOverlay(zoom) {
        return zoom <= 12;
    }

    function initUserLocation() {
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div class="user-dot"></div>',
            iconSize: [20, 20], // Increased for better hit area and visibility
            iconAnchor: [10, 10]
        });

        map.on('locationfound', (e) => {
            const location = { lat: e.latlng.lat, lon: e.latlng.lng };
            onUserLocationChange(location);

            if (!isWithinRottnestBounds(location)) {
                clearUserLocation();
                return;
            }

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
            updateUserLocationVisibility();
        });

        map.locate({setView: false, watch: true});
    }

    function clearUserLocation() {
        if (userLocationMarker) {
            userLocationMarker.remove();
            userLocationMarker = null;
        }
        if (userLocationCircle) {
            userLocationCircle.remove();
            userLocationCircle = null;
        }
    }

    function getBeachIcon(recommendation, rank = 0) {
        const selected = recommendation.beach.name === selectedBeachName ? 'selected' : '';
        const markerSize = getBeachMarkerSize(recommendation, currentZoom, selectedBeachName, rank);
        const sizeClass = markerSize.size < 28 ? 'compact' : markerSize.size < 34 ? 'small' : markerSize.size > 34 ? 'prominent' : '';
        return L.divIcon({
            className: `beach-marker ${recommendation.state} ${selected} ${sizeClass}`,
            html: `<span>${stateIcons[recommendation.state]}</span><small>${recommendation.score}</small>`,
            iconSize: [markerSize.size, markerSize.size],
            iconAnchor: [markerSize.anchor, markerSize.anchor]
        });
    }

    function updateBeachLabels() {
        beachMarkers.forEach(({ marker, recommendation, rank }) => {
            const shouldShow = shouldShowBeachLabel(recommendation, currentZoom, selectedBeachName, rank);
            const tooltip = marker.getTooltip();
            if (!tooltip) return;

            if (shouldShow) {
                marker.openTooltip();
            } else {
                marker.closeTooltip();
            }
        });
    }

    function shouldShowPlace(place) {
        const selected = place.name && place.name === selectedPlaceName;
        if (place.type === 'facility' || place.type === 'business') {
            return (filters.showFacilities === true || selected) && shouldShowPlaceMarker(place, currentZoom, selectedPlaceName);
        }
        if (filters.showLandmarks === false && !selected) return false;
        return shouldShowPlaceMarker(place, currentZoom, selectedPlaceName);
    }

    function getPlaceTooltipLabel(place) {
        if (place.name === selectedPlaceName && selectedPlaceDistanceLabel) {
            return `${place.name} · ${selectedPlaceDistanceLabel}`;
        }
        return place.name;
    }

    function getPlaceIcon(place) {
        if (place.subtype === 'lighthouse') return '🗼';
        if (place.category === 'cafe' || place.category === 'restaurant') return '☕';
        if (place.category === 'toilets') return '🚻';
        if (place.category === 'drinking_water') return '💧';
        if (place.category === 'bus_stop') return '🚌';
        if (place.category === 'bicycle_parking') return '🚲';
        if (place.category === 'visitor_centre') return 'ⓘ';
        if (place.type === 'business') return '🏪';
        return '📍';
    }

    function getPlacePopup(place) {
        const image = getPrimaryPlaceImage(place);
        const parts = [
            image ? `<img class="place-popup-image" src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" />` : '',
            `<strong>${escapeHtml(place.name)}</strong>`,
            `Type: ${escapeHtml(getFacilityTypeLabel(place))}`
        ].filter(Boolean);

        const ratingLabel = mapNavigationRequest?.name === place.name && mapNavigationRequest?.ratingLabel
            ? mapNavigationRequest.ratingLabel
            : getFacilityRatingLabel(place);
        if (ratingLabel) {
            parts.push(`Rating: ${escapeHtml(ratingLabel)}`);
        }

        if (place.name === selectedPlaceName && selectedPlaceDistanceLabel) {
            parts.push(`Distance: ${escapeHtml(selectedPlaceDistanceLabel)}`);
        }

        return parts.join('<br>');
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
        const pointsSignature = fitPoints.map((point) => point.join(',')).join('|');
        const previousPanelMode = lastVisibleBeachPanelMode;
        const previousMapLayout = lastVisibleBeachMapLayout;
        const fitReason = getVisibleBeachFitReason(
            lastVisibleBeachPointsSignature,
            pointsSignature,
            previousPanelMode,
            panelMode,
            previousMapLayout,
            mapLayout,
            hasExplicitBeachSelection
        );
        if (!map || !fitPoints.length || fitReason === 'none') return;

        lastVisibleBeachPointsSignature = pointsSignature;
        lastVisibleBeachPanelMode = panelMode;
        lastVisibleBeachMapLayout = mapLayout;
        const fitSettings = getVisibleBeachFitSettings(panelMode, mapLayout);

        if (fitPoints.length === 1) {
            const zoom = fitReason === 'panel' ? map.getZoom() : fitSettings.singleBeachZoom;
            map.flyTo(fitPoints[0], zoom, {
                animate: true,
                duration: 0.35
            });
        } else if (fitReason === 'panel') {
            map.panBy(getPanelModePanOffset(previousPanelMode, panelMode, mapLayout), {
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
        window.setTimeout(() => {
            if (!map) return;
            if (request.requestId !== lastNavigationRequestId) return;

            requestAnimationFrame(() => {
                if (!map || request.requestId !== lastNavigationRequestId) return;
                const zoom = request.zoom || 15;
                const center = getOffsetCenter(request, zoom);
                map.flyTo(center, zoom, {
                    animate: true,
                    duration: 0.45
                });
                currentZoom = map.getZoom();
                onZoomChange(currentZoom);
            });
        }, getNavigationSettleDelay(request));
    }

    function getOffsetCenter(request, zoom) {
        const offset = getNavigationOffset(request);
        const targetPoint = map.project([request.lat, request.lon], zoom);
        const centerPoint = targetPoint.add(L.point(offset[0], offset[1]));
        return map.unproject(centerPoint, zoom);
    }

    function getNavigationOffset(request) {
        if (!request.visibleAnchor) return request.offset || [0, 0];

        const visibleBounds = getVisibleMapBounds({
            constrainVerticalByPanel: request.visibleAnchor.constrainVerticalByPanel !== false
        });
        return getVisibleMapAnchorOffset({
            ...visibleBounds,
            targetXRatio: request.visibleAnchor.targetXRatio,
            targetYRatio: request.visibleAnchor.targetYRatio
        });
    }

    function getVisibleMapBounds({ constrainVerticalByPanel = true } = {}) {
        const mapRect = mapElement.getBoundingClientRect();
        const headerRect = document.querySelector('header')?.getBoundingClientRect();
        const panelRect = document.querySelector('.recommendation-panel')?.getBoundingClientRect();
        const isSidePanel = mapLayout === 'shortLandscape' || mapLayout === 'desktopSidePanel';

        return {
            mapWidth: mapRect.width,
            mapHeight: mapRect.height,
            visibleLeft: 0,
            visibleRight: isSidePanel && panelRect ? Math.max(panelRect.left - mapRect.left, 0) : mapRect.width,
            visibleTop: headerRect ? Math.max(headerRect.bottom - mapRect.top, 0) : 0,
            visibleBottom: constrainVerticalByPanel && !isSidePanel && panelRect ? Math.max(panelRect.top - mapRect.top, 0) : mapRect.height
        };
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
        const currentPanelMode = panelMode;
        const currentMapLayout = mapLayout;
        if (map) {
            map.invalidateSize({ pan: false });
            fitVisibleBeaches();
        }
    });

    $effect(() => {
        if (map && (landmarks.length > 0 || facilities.length > 0)) {
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
            updateLandmarks();
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

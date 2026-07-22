<script>
    import { onMount } from 'svelte';
    import L from 'leaflet';
    import 'leaflet/dist/leaflet.css';
    import {
        getInitialFitSettings,
        getLandmarkFitPoints,
        getMapNavigationTarget,
        getNavigationSettleDelay,
        getPanelModeMapOffset,
        getPanelModePanOffset,
        getPanelModeSelectionMapTarget,
        getBeachMarkerSize,
        shouldShowBeachLabel,
        shouldShowBeachMarker,
        shouldShowPlaceMarker,
        shouldShowPlaceLabel,
        getVisibleMapAnchorOffset,
        getVisibleBeachFitReason,
        getVisibleBeachFitPoints,
        getVisibleBeachFitSettings
    } from './mapFocus.js';
    import { formatDistanceLabel, getFacilityRatingLabel, getFacilityTypeLabel } from './facilities.js';
    import { isWithinRottnestBounds, shouldShowRecommendationScore } from './recommendations.js';

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
        onNavigateToMap = () => {},
        onZoomChange = () => {},
        onUserLocationChange = () => {}
    } = $props();

    let map;
    let mapElement;
    let beachMarkers = [];
    let placeMarkers = [];
    let placeClickTargets = new Map();
    let userLocationMarker = null;
    let userLocationCircle = null;
    let currentZoom = $state(12);
    let didFitInitialFocus = false;
    let lastNavigationRequestId = null;
    let isProgrammaticMapMove = false;
    let shouldRecenterSelectedNavigation = false;
    let lastVisibleBeachPointsSignature = '';
    let lastVisibleBeachPanelMode = 'closed';
    let lastVisibleBeachMapLayout = 'default';
    let panelSelectionRecenterSequence = 0;
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
        mapElement.addEventListener('click', handleMapElementClick);
        map.on('dragstart', handleManualMapMove);
        map.on('zoomend', () => {
            const nextZoom = map.getZoom();
            currentZoom = nextZoom;
            onZoomChange(currentZoom);
            recenterSelectedNavigationOnZoom(nextZoom);
            updateBeachLabels();
            updateLandmarks();
        });
        currentZoom = map.getZoom();
        onZoomChange(currentZoom);

        return () => {
            mapElement.removeEventListener('click', handleMapElementClick);
            map.off('dragstart', handleManualMapMove);
            map.remove();
        };
    });

    function handleManualMapMove() {
        if (isProgrammaticMapMove) return;
        shouldRecenterSelectedNavigation = false;
    }

    function initLandmarks() {
        placeMarkers.forEach(({ marker }) => marker.remove());
        placeMarkers = [];
        placeClickTargets = new Map();

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
            const selectPlace = () => {
                const target = getPlaceNavigationTarget(place);
                if (target) onNavigateToMap(target);
            };
            const placeKey = `${place.type || 'landmark'}:${place.id || place.name}`;
            placeClickTargets.set(placeKey, selectPlace);
            const marker = L.marker([place.lat, place.lon], { icon });
            marker.on('click', selectPlace);
            marker
                .bindTooltip(getPlaceTooltipLabel(place), {
                    permanent: shouldShowPlaceLabel(place, currentZoom, selectedPlaceName),
                    direction: 'top',
                    className: `place-label ${place.type} ${selected}`,
                    offset: [0, -8]
                })
                .addTo(map);
            attachPlaceClickTarget(marker, selectPlace, placeKey);
            if (selected) marker.setZIndexOffset(1000);
            placeMarkers.push({ marker, place });
        });
    }

    function handleMapElementClick(event) {
        const markerElement = event.target.closest?.('.landmark-icon');
        const placeKey = markerElement?.dataset?.placeKey;
        const selectPlace = placeClickTargets.get(placeKey);
        if (!selectPlace) return;

        event.preventDefault();
        event.stopPropagation();
        selectPlace();
    }

    function attachPlaceClickTarget(marker, selectPlace, placeKey) {
        requestAnimationFrame(() => {
            const markerElement = marker.getElement();
            if (!markerElement) return;

            markerElement.dataset.placeKey = placeKey;
            markerElement.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                selectPlace();
            };
        });
    }

    function getPlaceNavigationTarget(place) {
        const target = getMapNavigationTarget(
            place,
            16,
            getPanelModeMapOffset(panelMode, mapLayout)
        );
        if (!target) return null;

        return {
            ...place,
            ...target,
            type: place.type || 'landmark',
            label: getFacilityTypeLabel(place),
            ratingLabel: getFacilityRatingLabel(place),
            visibleAnchor: getSelectedPlaceVisibleAnchor()
        };
    }

    function initBeaches() {
        beachMarkers.forEach(mObj => mObj.marker.remove());
        beachMarkers = [];

        recommendations.forEach((recommendation, index) => {
            const beach = recommendation.beach;
            if (beach.lat && beach.lon && shouldShowBeachMarker(recommendation, currentZoom, selectedBeachName, index)) {
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
    }

    function updateBeaches() {
        if (!map || !beachMarkers.length) return;
        beachMarkers.forEach(mObj => {
            const { marker, recommendation, rank } = mObj;
            marker.setIcon(getBeachIcon(recommendation, rank));
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
        const sizeClass = markerSize.size < 24 ? 'tiny' : markerSize.size < 28 ? 'compact' : markerSize.size < 34 ? 'small' : markerSize.size > 34 ? 'prominent' : '';
        const scoreBadge = shouldShowRecommendationScore(recommendation, { selected: selected === 'selected' })
            ? `<small>${recommendation.score}</small>`
            : '';
        return L.divIcon({
            className: `beach-marker ${recommendation.state} ${selected} ${sizeClass}`,
            html: `<span>${stateIcons[recommendation.state]}</span>${scoreBadge}`,
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
        if (place.subtype === 'dive_site') return '🤿';
        if (place.subtype === 'shipwreck') return '⚓';
        if (place.category === 'cafe' || place.category === 'restaurant') return '☕';
        if (place.category === 'toilets') return '🚻';
        if (place.category === 'drinking_water') return '💧';
        if (place.category === 'bus_stop') return '🚌';
        if (place.category === 'bicycle_parking') return '🚲';
        if (place.category === 'visitor_centre') return 'ⓘ';
        if (place.type === 'business') return '🏪';
        return '📍';
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

        if (fitReason === 'panel' && hasExplicitBeachSelection) {
            const target = getPanelModeSelectionTarget();
            if (target) {
                recenterSelectedBeachForPanel(target);
                return;
            }
        }

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

    function getPanelModeSelectionTarget() {
        const selectedRecommendation = recommendations.find((item) => item.beach?.name === selectedBeachName);
        return getPanelModeSelectionMapTarget(selectedRecommendation?.beach, panelMode, mapLayout, map.getZoom());
    }

    function recenterSelectedBeachForPanel(target) {
        panelSelectionRecenterSequence += 1;
        const sequence = panelSelectionRecenterSequence;
        window.setTimeout(() => {
            if (!map || sequence !== panelSelectionRecenterSequence) return;

            const zoom = target.zoom || map.getZoom();
            const center = getOffsetCenter(target, zoom);
            flyToProgrammatically(center, zoom, {
                animate: true,
                duration: 0.35
            });
            currentZoom = map.getZoom();
            onZoomChange(currentZoom);
        }, getNavigationSettleDelay(target));
    }

    function navigateToMapRequest(request) {
        if (!map) return;
        if (!request) {
            cancelSelectedNavigationTracking();
            return;
        }
        if (request.requestId === lastNavigationRequestId) return;
        if (!Number.isFinite(request.lat) || !Number.isFinite(request.lon)) return;

        shouldRecenterSelectedNavigation = true;
        lastNavigationRequestId = request.requestId;
        window.setTimeout(() => {
            if (!map) return;
            if (request.requestId !== lastNavigationRequestId) return;

            requestAnimationFrame(() => {
                if (!map || request.requestId !== lastNavigationRequestId) return;
                const zoom = request.zoom || 15;
                const center = getOffsetCenter(request, zoom);
                flyToProgrammatically(center, zoom, {
                    animate: true,
                    duration: 0.45
                });
                currentZoom = map.getZoom();
                onZoomChange(currentZoom);
            });
        }, getNavigationSettleDelay(request));
    }

    function cancelSelectedNavigationTracking() {
        lastNavigationRequestId = null;
        shouldRecenterSelectedNavigation = false;
    }

    function getSelectedPlaceVisibleAnchor() {
        return {
            targetXRatio: 0.5,
            targetYRatio: 0.5,
            constrainVerticalByPanel: true,
            waitForPanelTransition: true
        };
    }

    function recenterSelectedNavigationOnZoom(zoom) {
        if (!mapNavigationRequest || isProgrammaticMapMove || !shouldRecenterSelectedNavigation) return;
        if (!Number.isFinite(mapNavigationRequest.lat) || !Number.isFinite(mapNavigationRequest.lon)) return;

        requestAnimationFrame(() => {
            if (!map || !mapNavigationRequest || isProgrammaticMapMove) return;
            const center = getOffsetCenter(mapNavigationRequest, zoom);
            setViewProgrammatically(center, zoom, { animate: false });
        });
    }

    function flyToProgrammatically(center, zoom, options) {
        markProgrammaticMapMove();
        map.flyTo(center, zoom, options);
    }

    function setViewProgrammatically(center, zoom, options) {
        markProgrammaticMapMove();
        map.setView(center, zoom, options);
    }

    function markProgrammaticMapMove() {
        isProgrammaticMapMove = true;
        const clearProgrammaticMove = () => {
            if (!map) return;

            isProgrammaticMapMove = false;
            map.off('moveend', clearProgrammaticMove);
            map.off('zoomend', clearProgrammaticMove);
        };

        map.once('moveend', clearProgrammaticMove);
        map.once('zoomend', clearProgrammaticMove);
        window.setTimeout(clearProgrammaticMove, 700);
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
        const selectedPlaceRect = document.querySelector('.selected-map-place-card')?.getBoundingClientRect();
        const isSidePanel = mapLayout === 'shortLandscape' || mapLayout === 'desktopSidePanel';
        const panelTop = panelRect ? panelRect.top - mapRect.top : mapRect.height;
        const selectedPlaceTop = selectedPlaceRect ? selectedPlaceRect.top - mapRect.top : mapRect.height;

        return {
            mapWidth: mapRect.width,
            mapHeight: mapRect.height,
            visibleLeft: 0,
            visibleRight: isSidePanel && panelRect ? Math.max(panelRect.left - mapRect.left, 0) : mapRect.width,
            visibleTop: headerRect ? Math.max(headerRect.bottom - mapRect.top, 0) : 0,
            visibleBottom: constrainVerticalByPanel && !isSidePanel ? Math.max(Math.min(panelTop, selectedPlaceTop), 0) : mapRect.height
        };
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
        if (!hasExplicitBeachSelection) {
            panelSelectionRecenterSequence += 1;
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

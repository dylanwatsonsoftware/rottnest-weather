export function getInitialFitSettings() {
    return {
        minZoom: null,
        fitBoundsOptions: {
            paddingTopLeft: [42, 150],
            paddingBottomRight: [42, 190],
            maxZoom: 14
        }
    };
}

export function getLandmarkFitPoints(landmarks = []) {
    return landmarks
        .filter((landmark) => Number.isFinite(landmark.lat) && Number.isFinite(landmark.lon))
        .map((landmark) => [landmark.lat, landmark.lon]);
}

export function getMapLayout({ width = 0, height = 0 } = {}) {
    if (width > height && height <= 430) return 'shortLandscape';
    if (width >= 900 && height > 430) return 'desktopSidePanel';
    return 'default';
}

export function getVisibleBeachFitSettings(panelMode = 'collapsed', mapLayout = 'default') {
    const expandedPanel = isPanelOpen(panelMode);

    if (mapLayout === 'shortLandscape') {
        return {
            singleBeachZoom: 14,
            fitBoundsOptions: {
                paddingTopLeft: [42, 70],
                paddingBottomRight: [expandedPanel ? 390 : 170, 42],
                maxZoom: 14
            }
        };
    }

    if (mapLayout === 'desktopSidePanel') {
        return {
            singleBeachZoom: 14,
            fitBoundsOptions: {
                paddingTopLeft: [42, 120],
                paddingBottomRight: [expandedPanel ? 480 : 320, 170],
                maxZoom: 14
            }
        };
    }

    return {
        singleBeachZoom: 14,
        fitBoundsOptions: {
            paddingTopLeft: [42, 140],
            paddingBottomRight: [42, expandedPanel ? 560 : 170],
            maxZoom: 14
        }
    };
}

export function shouldShowBeachLabel(recommendation = {}, zoom = 12, selectedBeachName = '', rank = 0) {
    const beachName = recommendation.beach?.name || '';
    if (beachName && beachName === selectedBeachName) return true;
    if (recommendation.state === 'best') return true;
    if (zoom >= 15) return true;
    if (zoom >= 13) return rank < 6;
    if (zoom >= 12) return rank < 3;
    return rank < 1;
}

export function shouldShowBeachMarker(recommendation = {}, zoom = 12, selectedBeachName = '', rank = 0) {
    return true;
}

export function getBeachMarkerSize(recommendation = {}, zoom = 12, selectedBeachName = '', rank = 0) {
    const beachName = recommendation.beach?.name || '';
    if (beachName && beachName === selectedBeachName) return toMarkerSize(40);
    if (recommendation.state === 'best') return toMarkerSize(38);
    if (zoom >= 15) return toMarkerSize(34);
    if (rank < 4) return toMarkerSize(34);
    if (zoom >= 12) return toMarkerSize(28);
    return toMarkerSize(24);
}

export function shouldShowPlaceLabel(place = {}, zoom = 12, selectedPlaceName = '') {
    return Boolean(place.name && place.name === selectedPlaceName);
}

export function shouldShowPlaceMarker(place = {}, zoom = 12, selectedPlaceName = '') {
    if (place.name && place.name === selectedPlaceName) return true;
    if (place.subtype === 'lighthouse') return true;

    const category = place.category || place.subtype || place.type;
    if (place.type === 'landmark') return zoom > 10;
    if (category === 'cafe' || category === 'restaurant' || place.type === 'business') return zoom >= 13;
    if (category === 'visitor_centre' || category === 'bus_stop') return zoom >= 14;
    if (category === 'toilets' || category === 'drinking_water' || category === 'bbq' || category === 'bicycle_parking' || category === 'shower') {
        return zoom >= 15;
    }
    return zoom >= 15;
}

export function getVisibleBeachFitPoints(recommendations = []) {
    return recommendations
        .map((recommendation) => recommendation.beach)
        .filter((beach) => Number.isFinite(beach?.lat) && Number.isFinite(beach?.lon))
        .map((beach) => [beach.lat, beach.lon]);
}

export function getVisibleBeachFitReason(
    previousPointsSignature,
    nextPointsSignature,
    previousPanelMode,
    nextPanelMode,
    previousMapLayout = 'default',
    nextMapLayout = 'default',
    hasExplicitBeachSelection = false
) {
    if (previousPanelMode !== nextPanelMode) return 'panel';
    if (previousMapLayout !== nextMapLayout) return 'panel';
    if (previousPointsSignature !== nextPointsSignature && !hasExplicitBeachSelection) return 'points';
    return 'none';
}

export function getPanelModePanOffset(previousPanelMode, nextPanelMode, mapLayout = 'default') {
    if (previousPanelMode === nextPanelMode) return [0, 0];
    if (isPanelOpen(previousPanelMode) === isPanelOpen(nextPanelMode)) return [0, 0];
    if (mapLayout === 'shortLandscape') {
        return isPanelOpen(nextPanelMode) ? [280, -90] : [-280, 90];
    }
    return isPanelOpen(nextPanelMode) ? [0, 300] : [0, -300];
}

export function getPanelModeMapOffset(panelMode = 'collapsed', mapLayout = 'default') {
    if (mapLayout === 'shortLandscape') {
        return isPanelOpen(panelMode) ? [360, 0] : [170, 90];
    }
    if (mapLayout === 'desktopSidePanel') {
        return isPanelOpen(panelMode) ? [220, 0] : [0, 0];
    }
    return isPanelOpen(panelMode) ? [0, 320] : [0, 180];
}

export const PANEL_TRANSITION_SETTLE_MS = 220;

export function getBeachSelectionMapTarget(beach, panelMode = 'collapsed', mapLayout = 'default') {
    const target = getMapNavigationTarget(beach, 16, getPanelModeMapOffset(panelMode, mapLayout));
    if (!target) return null;

    return withVisiblePanelAnchor(target);
}

export function getPanelModeSelectionMapTarget(beach, panelMode = 'collapsed', mapLayout = 'default', currentZoom = 16) {
    const zoom = Number.isFinite(currentZoom) ? currentZoom : 16;
    const target = getMapNavigationTarget(beach, zoom, getPanelModeMapOffset(panelMode, mapLayout));
    if (!target) return null;

    return withVisiblePanelAnchor(target);
}

function withVisiblePanelAnchor(target) {
    return {
        ...target,
        visibleAnchor: {
            targetXRatio: 0.5,
            targetYRatio: 0.5,
            constrainVerticalByPanel: true,
            waitForPanelTransition: true
        }
    };
}

export function getMapLayoutChangeTarget(beach, panelMode = 'collapsed', previousMapLayout = 'default', nextMapLayout = 'default') {
    if (previousMapLayout === nextMapLayout) return null;
    return getBeachSelectionMapTarget(beach, panelMode, nextMapLayout);
}

export function getMapNavigationTarget(place, zoom = 15, offset = [0, 180]) {
    if (!Number.isFinite(place?.lat) || !Number.isFinite(place?.lon)) return null;

    const target = {
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        zoom,
        offset
    };
    if (place.source_url) target.source_url = place.source_url;
    if (place.coordinate_source_url) target.coordinate_source_url = place.coordinate_source_url;
    return target;
}

export function getVisibleMapAnchorOffset({
    mapWidth = 0,
    mapHeight = 0,
    visibleLeft = 0,
    visibleRight = mapWidth,
    visibleTop = 0,
    visibleBottom = mapHeight,
    targetXRatio = 0.5,
    targetYRatio = 0.5
} = {}) {
    const safeMapWidth = Math.max(mapWidth, 0);
    const safeMapHeight = Math.max(mapHeight, 0);
    const left = clampPixel(visibleLeft, 0, safeMapWidth);
    const right = clampPixel(visibleRight, left, safeMapWidth);
    const top = clampPixel(visibleTop, 0, safeMapHeight);
    const bottom = clampPixel(visibleBottom, top, safeMapHeight);
    const xRatio = clampRatio(targetXRatio);
    const yRatio = clampRatio(targetYRatio);
    const targetX = left + (right - left) * xRatio;
    const targetY = top + (bottom - top) * yRatio;

    return [
        Math.round(safeMapWidth / 2 - targetX),
        Math.round(safeMapHeight / 2 - targetY)
    ];
}

export function getNavigationSettleDelay(request = {}) {
    return request.visibleAnchor?.waitForPanelTransition ? PANEL_TRANSITION_SETTLE_MS : 0;
}

function clampPixel(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(value, max));
}

function clampRatio(value) {
    if (!Number.isFinite(value)) return 0.5;
    return Math.max(0, Math.min(value, 1));
}

function toMarkerSize(size) {
    return {
        size,
        anchor: size / 2
    };
}

function isPanelOpen(panelMode) {
    return panelMode === 'open' || panelMode === 'expanded';
}

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
    return width > height && height <= 430 ? 'shortLandscape' : 'default';
}

export function getVisibleBeachFitSettings(panelMode = 'collapsed', mapLayout = 'default') {
    const expandedPanel = panelMode !== 'collapsed';

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

    return {
        singleBeachZoom: 14,
        fitBoundsOptions: {
            paddingTopLeft: [42, 140],
            paddingBottomRight: [42, expandedPanel ? 560 : 170],
            maxZoom: 14
        }
    };
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
    if (mapLayout === 'shortLandscape') {
        return nextPanelMode === 'collapsed' ? [-280, 90] : [280, -90];
    }
    return nextPanelMode === 'collapsed' ? [0, -300] : [0, 300];
}

export function getPanelModeMapOffset(panelMode = 'collapsed', mapLayout = 'default') {
    if (mapLayout === 'shortLandscape') {
        return panelMode === 'collapsed' ? [170, 90] : [360, 0];
    }
    return panelMode === 'collapsed' ? [0, 180] : [0, 320];
}

export const PANEL_TRANSITION_SETTLE_MS = 220;

export function getBeachSelectionMapTarget(beach, panelMode = 'collapsed', mapLayout = 'default') {
    const target = getMapNavigationTarget(beach, 15, getPanelModeMapOffset(panelMode, mapLayout));
    if (!target) return null;

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

    return {
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        zoom,
        offset
    };
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

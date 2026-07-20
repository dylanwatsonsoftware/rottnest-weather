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
    nextMapLayout = 'default'
) {
    if (previousPointsSignature !== nextPointsSignature) return 'points';
    if (previousPanelMode !== nextPanelMode) return 'panel';
    if (previousMapLayout !== nextMapLayout) return 'panel';
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

export function getBeachSelectionMapTarget(beach, panelMode = 'collapsed', mapLayout = 'default') {
    return getMapNavigationTarget(beach, 15, getPanelModeMapOffset(panelMode, mapLayout));
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

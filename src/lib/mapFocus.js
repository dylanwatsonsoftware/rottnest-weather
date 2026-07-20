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

export function getVisibleBeachFitSettings(panelMode = 'collapsed') {
    const expandedPanel = panelMode !== 'collapsed';

    return {
        singleBeachZoom: 14,
        fitBoundsOptions: {
            paddingTopLeft: [42, 140],
            paddingBottomRight: [42, expandedPanel ? 390 : 170],
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

export function getVisibleBeachFitReason(previousPointsSignature, nextPointsSignature, previousPanelMode, nextPanelMode) {
    if (previousPointsSignature !== nextPointsSignature) return 'points';
    if (previousPanelMode !== nextPanelMode) return 'panel';
    return 'none';
}

export function getPanelModePanOffset(previousPanelMode, nextPanelMode) {
    if (previousPanelMode === nextPanelMode) return [0, 0];
    return nextPanelMode === 'collapsed' ? [0, -180] : [0, 180];
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

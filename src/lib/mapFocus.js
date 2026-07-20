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

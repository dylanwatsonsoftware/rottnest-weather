export function getInitialFitSettings({ hasBeachFocus }) {
    if (hasBeachFocus) {
        return {
            minZoom: 13,
            fitBoundsOptions: {
                paddingTopLeft: [42, 96],
                paddingBottomRight: [42, 160],
                maxZoom: 14
            }
        };
    }

    return {
        minZoom: null,
        fitBoundsOptions: {
            paddingTopLeft: [42, 96],
            paddingBottomRight: [42, 280],
            maxZoom: 14
        }
    };
}

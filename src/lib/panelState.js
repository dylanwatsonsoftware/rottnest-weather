export const PANEL_MODES = {
    expanded: 'expanded',
    collapsed: 'collapsed'
};

export function getDefaultPanelMode() {
    return PANEL_MODES.collapsed;
}

export function getNextPanelMode(mode) {
    if (mode === PANEL_MODES.expanded) return PANEL_MODES.collapsed;
    if (mode === PANEL_MODES.collapsed) return PANEL_MODES.expanded;
    return PANEL_MODES.expanded;
}

export function getForecastSliderMax(forecastData) {
    return Math.max((forecastData?.time?.length || 1) - 1, 0);
}

export function shouldShowConfidenceLabel(confidence) {
    return Boolean(confidence && confidence !== 'normal');
}

export function getPanelModeAfterOpenRequest(mode, openRequest, lastHandledRequest) {
    return openRequest !== lastHandledRequest ? PANEL_MODES.expanded : mode;
}

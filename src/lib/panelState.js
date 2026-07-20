export const PANEL_MODES = {
    expanded: 'expanded',
    collapsed: 'collapsed'
};

export function getNextPanelMode(mode) {
    if (mode === PANEL_MODES.expanded) return PANEL_MODES.collapsed;
    if (mode === PANEL_MODES.collapsed) return PANEL_MODES.expanded;
    return PANEL_MODES.expanded;
}

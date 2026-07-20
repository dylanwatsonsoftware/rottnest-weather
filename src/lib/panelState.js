export const PANEL_MODES = {
    expanded: 'expanded',
    collapsed: 'collapsed'
};

export const RANGE_MODES = ['today', 'twoDay', 'threeDay', 'tenDay'];

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

export function getForecastRange(forecastData, rangeMode = 'today') {
    const max = getForecastSliderMax(forecastData);
    const times = forecastData?.time || [];
    if (!times.length) return { min: 0, max };

    if (rangeMode === 'twoDay' || rangeMode === 'threeDay' || rangeMode === 'tenDay') {
        const dayCount = {
            twoDay: 2,
            threeDay: 3,
            tenDay: 10
        }[rangeMode];

        return {
            min: 0,
            max: getForecastDayRangeMax(times, dayCount)
        };
    }

    const firstDate = getDateKey(times[0]);
    const daylightIndexes = times
        .map((time, index) => ({ time: new Date(time), index }))
        .filter(({ time }) => getDateKey(time) === firstDate)
        .filter(({ time }) => time.getHours() >= 6 && time.getHours() <= 18)
        .map(({ index }) => index);

    if (!daylightIndexes.length) return { min: 0, max };

    return {
        min: daylightIndexes[0],
        max: daylightIndexes[daylightIndexes.length - 1]
    };
}

export function getRangeModeLabel(rangeMode) {
    if (rangeMode === 'twoDay') return '2 days';
    if (rangeMode === 'threeDay') return '3 days';
    if (rangeMode === 'tenDay') return '10 days';
    return 'Today';
}

export function getForecastChartLabels(times = [], forecastRange = { min: 0, max: 0 }, rangeMode = 'today') {
    const start = forecastRange.min;
    const end = forecastRange.max + 1;
    const rangeTimes = times.slice(start, end);

    if (rangeMode === 'today') {
        return rangeTimes.map((time) => formatChartTime(time));
    }

    let previousDate = '';
    return rangeTimes.map((time, index) => {
        const date = new Date(time);
        const dateKey = getDateKey(date);
        const shouldLabel = index === 0 || dateKey !== previousDate;
        previousDate = dateKey;
        return shouldLabel ? formatChartDay(date) : '';
    });
}

export function getForecastChartDensity(rangeMode = 'today', forecastRange = { min: 0, max: 0 }) {
    const pointCount = Math.max(forecastRange.max - forecastRange.min + 1, 0);

    if (rangeMode === 'tenDay' || pointCount > 120) {
        return {
            windArrowEvery: 24,
            maxTicksLimit: 8,
            pointRadius: 0,
            windArrowSize: 11
        };
    }

    if (rangeMode === 'threeDay' || pointCount > 48) {
        return {
            windArrowEvery: 12,
            maxTicksLimit: 7,
            pointRadius: 1,
            windArrowSize: 12
        };
    }

    if (rangeMode === 'twoDay' || pointCount > 18) {
        return {
            windArrowEvery: 6,
            maxTicksLimit: 6,
            pointRadius: 2,
            windArrowSize: 13
        };
    }

    return {
        windArrowEvery: 3,
        maxTicksLimit: 6,
        pointRadius: 3,
        windArrowSize: 14
    };
}

export function getLaterTabHourIndex(recommendations = [], currentHourIndex = 0, forecastData = null, fallbackHours = 3) {
    const futureWindows = recommendations
        .map((item) => item.nextGood?.hourIndex)
        .filter((index) => Number.isFinite(index) && index > currentHourIndex)
        .sort((a, b) => a - b);

    if (futureWindows.length) return futureWindows[0];

    return Math.min(currentHourIndex + fallbackHours, getForecastSliderMax(forecastData));
}

export function getRangeModeForHourIndex(forecastData, hourIndex) {
    if (hourIndex <= getForecastRange(forecastData, 'today').max) return 'today';
    if (hourIndex <= getForecastRange(forecastData, 'twoDay').max) return 'twoDay';
    if (hourIndex <= getForecastRange(forecastData, 'threeDay').max) return 'threeDay';
    return 'tenDay';
}

export function shouldShowConfidenceLabel(confidence) {
    return Boolean(confidence && confidence !== 'normal');
}

export function getPanelModeAfterOpenRequest(mode, openRequest, lastHandledRequest) {
    return openRequest !== lastHandledRequest ? PANEL_MODES.expanded : mode;
}

function getForecastDayRangeMax(times, dayCount) {
    const firstDate = new Date(times[0]);
    const endDate = new Date(firstDate);
    endDate.setDate(firstDate.getDate() + dayCount);

    const maxIndex = times.findLastIndex((time) => new Date(time) < endDate);
    return maxIndex >= 0 ? maxIndex : times.length - 1;
}

function getDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatChartTime(value) {
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatChartDay(value) {
    const dayName = value.toLocaleDateString([], { weekday: 'short' });
    return `${dayName} ${value.getDate()}`;
}

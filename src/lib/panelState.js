import { formatCompactTime } from './timeFormat.js';

export const PANEL_MODES = {
    open: 'open',
    semi: 'semi',
    closed: 'closed'
};

export const RANGE_MODES = ['today', 'twoDay', 'threeDay', 'tenDay'];

export const SLIDER_STATE_COLORS = {
    best: '#167a52',
    good: '#2e8b86',
    watch: '#c58a24',
    avoid: '#b44545',
    unknown: '#dbe5e5'
};

export function getDefaultPanelMode() {
    return PANEL_MODES.closed;
}

export function getNextPanelMode(mode) {
    if (mode === PANEL_MODES.open) return PANEL_MODES.semi;
    if (mode === PANEL_MODES.semi) return PANEL_MODES.open;
    if (mode === PANEL_MODES.closed) return PANEL_MODES.semi;
    return PANEL_MODES.semi;
}

export function getPanelModeFromSwipe(mode, deltaY, { smallThreshold = 40, largeThreshold = 120 } = {}) {
    if (!Number.isFinite(deltaY) || Math.abs(deltaY) < smallThreshold) return mode;

    if (deltaY <= -largeThreshold) return PANEL_MODES.open;
    if (deltaY >= largeThreshold) return PANEL_MODES.closed;
    if (deltaY < 0) return mode === PANEL_MODES.closed ? PANEL_MODES.semi : PANEL_MODES.open;
    return mode === PANEL_MODES.open ? PANEL_MODES.semi : PANEL_MODES.closed;
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

export function getSliderHeatGradient(timeline = [], range = {}) {
    if (!timeline.length) return SLIDER_STATE_COLORS.unknown;

    const min = Number.isFinite(range.min) ? range.min : 0;
    const max = Number.isFinite(range.max) ? range.max : min;
    const hourCount = Math.max(max - min + 1, 0);
    if (!hourCount) return SLIDER_STATE_COLORS.unknown;

    const stateByHour = new Map(timeline.map((item) => [item.hourIndex, item.state]));
    const stops = [];

    for (let index = 0; index < hourCount; index += 1) {
        const hourIndex = min + index;
        const color = SLIDER_STATE_COLORS[stateByHour.get(hourIndex)] || SLIDER_STATE_COLORS.unknown;
        const start = index / hourCount * 100;
        const end = (index + 1) / hourCount * 100;
        stops.push(`${color} ${start.toFixed(2)}%`, `${color} ${end.toFixed(2)}%`);
    }

    return `linear-gradient(to right, ${stops.join(', ')})`;
}

export function getRangeProgressPercent(range = {}, hourIndex = 0) {
    const min = Number.isFinite(range.min) ? range.min : 0;
    const max = Number.isFinite(range.max) ? range.max : min;
    if (max <= min) return 0;

    const clampedHour = Math.max(min, Math.min(hourIndex, max));
    return Math.round((clampedHour - min) / (max - min) * 100);
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
    const todayRange = getForecastRange(forecastData, 'today');
    if (hourIndex >= todayRange.min && hourIndex <= todayRange.max) return 'today';
    if (hourIndex <= getForecastRange(forecastData, 'twoDay').max) return 'twoDay';
    if (hourIndex <= getForecastRange(forecastData, 'threeDay').max) return 'threeDay';
    return 'tenDay';
}

export function getBetterTimeSelection(recommendations = [], currentHourIndex = 0, forecastData = null) {
    const hourIndex = getLaterTabHourIndex(recommendations, currentHourIndex, forecastData);

    return {
        hourIndex,
        rangeMode: getRangeModeForHourIndex(forecastData, hourIndex)
    };
}

export function getRecommendationHeading(forecastData, hourIndex = 0, now = new Date()) {
    const times = forecastData?.time || [];
    if (!times.length) return 'Best beaches';

    const selectedIndex = clampIndex(hourIndex, times.length);
    const selectedDate = new Date(times[selectedIndex]);
    const nowDate = now instanceof Date ? now : new Date(now);
    const nearestNowIndex = getNearestTimeIndex(times, nowDate);

    if (selectedIndex === nearestNowIndex) return 'Best now';
    if (getDateKey(selectedDate) === getDateKey(nowDate)) {
        return `Best at ${formatHeadingTime(selectedDate)}`;
    }

    return `Best ${formatHeadingDayTime(selectedDate, nowDate)}`;
}

export function getStatusWindowSummary(timeline = [], selectedHourIndex = 0) {
    const selectedIndex = timeline.findIndex((item) => item.hourIndex === selectedHourIndex);
    if (selectedIndex === -1) return 'Forecast window unavailable';

    const selectedState = timeline[selectedIndex].state;
    let start = selectedIndex;
    let end = selectedIndex;

    while (start > 0 && timeline[start - 1].state === selectedState) start -= 1;
    while (end < timeline.length - 1 && timeline[end + 1].state === selectedState) end += 1;

    const hours = end - start + 1;
    const label = getWindowStateLabel(selectedState);
    return `${label} for ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function shouldShowConfidenceLabel(confidence) {
    return Boolean(confidence && confidence !== 'normal');
}

export function getPanelModeAfterOpenRequest(mode, openRequest, lastHandledRequest) {
    if (!openRequest) return mode;
    return openRequest !== lastHandledRequest ? PANEL_MODES.open : mode;
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

function getNearestTimeIndex(times, now) {
    let nearestIndex = 0;
    let nearestDiff = Infinity;

    times.forEach((time, index) => {
        const diff = Math.abs(new Date(time) - now);
        if (diff < nearestDiff) {
            nearestDiff = diff;
            nearestIndex = index;
        }
    });

    return nearestIndex;
}

function clampIndex(index, length) {
    if (!Number.isFinite(index)) return 0;
    return Math.max(0, Math.min(index, Math.max(length - 1, 0)));
}

function formatHeadingTime(value) {
    return formatCompactTime(value);
}

function formatHeadingDayTime(value, now) {
    return formatCompactTime(value, { weekday: true, now });
}

function formatChartTime(value) {
    return formatCompactTime(value);
}

function formatChartDay(value) {
    const dayName = value.toLocaleDateString([], { weekday: 'short' });
    return `${dayName} ${value.getDate()}`;
}

function getWindowStateLabel(state) {
    if (state === 'best') return 'Best';
    if (state === 'good') return 'Good';
    if (state === 'watch') return 'Use caution';
    return 'Avoid';
}

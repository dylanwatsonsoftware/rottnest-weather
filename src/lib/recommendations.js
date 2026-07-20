export const RECOMMENDATION_STATES = ['best', 'good', 'watch', 'avoid'];
export const ROTTNEST_BOUNDS = {
    north: -31.975,
    south: -32.04,
    west: 115.435,
    east: 115.565
};

export function getDirection(degrees = 0) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(Number(degrees || 0) / 45) % 8;
    return directions[index];
}

export function getWindArrow(degrees = 0) {
    const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘'];
    const index = Math.round(Number(degrees || 0) / 45) % 8;
    return arrows[index];
}

export function getConditions(forecastData, hourIndex) {
    if (!forecastData || !forecastData.time?.length) {
        return {
            time: null,
            windSpeed: null,
            windDirectionDegrees: null,
            windDirection: 'N',
            temperature: null,
            swellHeight: null,
            hasForecast: false,
            hasSwell: false
        };
    }

    const index = clamp(hourIndex, 0, forecastData.time.length - 1);
    const swellHeight = forecastData.swell_wave_height?.[index];
    const windDirectionDegrees = forecastData.winddirection_10m?.[index] ?? 0;

    return {
        time: forecastData.time[index],
        windSpeed: forecastData.windspeed_10m?.[index] ?? null,
        windDirectionDegrees,
        windDirection: getDirection(windDirectionDegrees),
        temperature: forecastData.temperature_2m?.[index] ?? null,
        swellHeight: Number.isFinite(swellHeight) ? swellHeight : null,
        hasForecast: true,
        hasSwell: Number.isFinite(swellHeight)
    };
}

export function scoreBeach(beach, conditions) {
    const reasons = [];
    const okWinds = beach.ok_winds || [];
    const directionMatches = okWinds.includes(conditions.windDirection);
    let score = directionMatches ? 72 : 22;

    if (directionMatches) {
        reasons.push(`${conditions.windDirection} wind is suitable for this beach.`);
    } else {
        reasons.push(`Wind direction ${conditions.windDirection} is not one of this beach's preferred winds.`);
    }

    if (Number.isFinite(conditions.windSpeed)) {
        if (conditions.windSpeed <= 15) {
            score += 14;
            reasons.push('Light wind should keep the surface calmer.');
        } else if (conditions.windSpeed <= 25) {
            score += 4;
            reasons.push('Moderate wind is usable but may add chop.');
        } else if (conditions.windSpeed <= 32) {
            score -= 18;
            reasons.push('Fresh wind may make the water choppy.');
        } else {
            score -= 34;
            reasons.push('Strong wind is a safety and comfort concern.');
        }
    } else {
        score -= 18;
        reasons.push('Wind forecast is unavailable.');
    }

    if (Number.isFinite(conditions.swellHeight)) {
        if (conditions.swellHeight <= 0.7) {
            score += 10;
            reasons.push('Small swell is friendly for visibility.');
        } else if (conditions.swellHeight <= 1.1) {
            score += 2;
            reasons.push('Manageable swell for confident snorkellers.');
        } else if (conditions.swellHeight <= 1.5) {
            score -= 16;
            reasons.push('Swell may reduce visibility around reef edges.');
        } else {
            score -= 30;
            reasons.push('Larger swell may make this a poor snorkeling window.');
        }
    } else {
        score -= 8;
        reasons.push('Swell forecast is unavailable, so confidence is lower.');
    }

    const flexibility = okWinds.length;
    if (flexibility >= 7) score += 4;
    if (flexibility <= 2) score -= 4;

    const safetyTags = beach.safety_tags || [];
    if (safetyTags.includes('surf_break')) {
        score -= 10;
        reasons.push('This is a known surf break, so snorkeling comfort depends heavily on swell and ability.');
    }
    if (safetyTags.includes('wildlife_sensitive')) {
        score -= 4;
        reasons.push('Local wildlife may be present; keep respectful distance in and out of the water.');
    }
    if (beach.advisory?.status === 'watch') {
        score -= 8;
        reasons.push(beach.advisory.message || 'Check current local advisories before entering the water.');
    }
    if (beach.advisory?.status === 'closed') {
        score = 0;
        reasons.push(beach.advisory.message || 'This beach is marked closed in local advisory data.');
    }

    score = clamp(Math.round(score), 0, 100);
    const state = getState(score, directionMatches, flexibility);
    const confidence = conditions.hasForecast && conditions.hasSwell ? 'normal' : 'low';

    return {
        beach,
        score,
        state,
        confidence,
        summary: getSummary(state, score),
        reasons,
        conditions,
        nextGood: null
    };
}

export function buildRecommendations(beaches = [], forecastData, hourIndex = 0) {
    const selectedConditions = getConditions(forecastData, hourIndex);

    return beaches
        .map((beach) => {
            const recommendation = scoreBeach(beach, selectedConditions);
            recommendation.nextGood = findNextGoodWindow(beach, forecastData, hourIndex + 1);
            return recommendation;
        })
        .sort((a, b) => b.score - a.score || a.beach.name.localeCompare(b.beach.name));
}

export function buildBeachStatusTimeline(beach, forecastData, range = {}) {
    if (!beach || !forecastData?.time?.length) return [];

    const min = clamp(range.min ?? 0, 0, forecastData.time.length - 1);
    const max = clamp(range.max ?? forecastData.time.length - 1, min, forecastData.time.length - 1);
    const items = [];

    for (let index = min; index <= max; index += 1) {
        const recommendation = scoreBeach(beach, getConditions(forecastData, index));
        items.push({
            hourIndex: index,
            time: forecastData.time[index],
            label: formatTimelineTime(forecastData.time[index]),
            state: recommendation.state,
            score: recommendation.score,
            summary: recommendation.summary
        });
    }

    return items;
}

export function buildBestBeachTimeline(recommendations = [], forecastData, range = {}) {
    if (!recommendations.length || !forecastData?.time?.length) return [];

    const bestByHour = new Map();
    recommendations.forEach((recommendation) => {
        buildBeachStatusTimeline(recommendation.beach, forecastData, range).forEach((item) => {
            const current = bestByHour.get(item.hourIndex);
            if (!current || item.score > current.score || (item.score === current.score && item.beach.name.localeCompare(current.beach.name) < 0)) {
                bestByHour.set(item.hourIndex, {
                    ...item,
                    beach: recommendation.beach
                });
            }
        });
    });

    return [...bestByHour.values()].sort((a, b) => a.hourIndex - b.hourIndex);
}

export function getBeachDetailNotes(beach = {}) {
    const notes = [];

    if (beach.exposure_note) notes.push(beach.exposure_note);
    if (beach.facilities?.length) notes.push(`Facilities: ${beach.facilities.join(', ')}`);
    if (beach.activity_tags?.length) notes.push(`Good for: ${beach.activity_tags.join(', ')}`);
    if (beach.advisory?.message) notes.push(`Advisory: ${beach.advisory.message}`);
    if (beach.guide_note) notes.push(beach.guide_note);
    if (beach.caution_notes?.length) notes.push(...beach.caution_notes);

    return notes;
}

export function findNextGoodWindow(beach, forecastData, startIndex = 0) {
    if (!forecastData?.time?.length) return null;

    for (let index = clamp(startIndex, 0, forecastData.time.length); index < forecastData.time.length; index += 1) {
        const conditions = getConditions(forecastData, index);
        const candidate = scoreBeach(beach, conditions);
        if (candidate.state === 'best' || candidate.state === 'good') {
            return {
                time: conditions.time,
                hourIndex: index,
                state: candidate.state,
                score: candidate.score,
                windDirection: conditions.windDirection,
                windSpeed: conditions.windSpeed,
                swellHeight: conditions.swellHeight
            };
        }
    }

    return null;
}

export function filterRecommendations(recommendations = [], filters = {}, zoom = 13) {
    if (filters.showBeaches === false) return [];

    const states = filters.states || {};
    const minimumScore = Number.isFinite(filters.minimumScore) ? filters.minimumScore : 0;
    const enabledStates = RECOMMENDATION_STATES.filter((state) => states[state] !== false);
    let filtered = recommendations.filter((item) =>
        item.score >= minimumScore
        && (enabledStates.includes(item.state) || (filters.includeLeastBad && item.state === 'avoid'))
    );

    if (zoom <= 11 && filters.showAllWhenZoomedOut === false) {
        const topSafe = filtered.filter((item) => item.state !== 'avoid').slice(0, 6);
        filtered = topSafe.length ? topSafe : filtered.slice(0, 4);
    }

    return filtered;
}

export function getInitialFocusRecommendations(
    recommendations = [],
    forecastData,
    hourIndex = 0,
    userLocation = null,
    limit = 3,
    windowHours = 6
) {
    if (!recommendations.length) return [];
    if (!recommendations.some((item) => item.state === 'best' || item.state === 'good')) return [];

    const effectiveUserLocation = shouldUseUserLocationForFocus(recommendations, userLocation)
        ? userLocation
        : null;

    return recommendations
        .map((recommendation) => {
            const focus = getFocusScore(recommendation, forecastData, hourIndex, effectiveUserLocation, windowHours);
            return {
                ...recommendation,
                focus
            };
        })
        .filter((item) => item.focus.bestUpcomingScore >= 60 || item.state !== 'avoid')
        .sort((a, b) => {
            if (effectiveUserLocation) {
                return b.focus.rank - a.focus.rank
                    || a.focus.distanceKm - b.focus.distanceKm
                    || b.score - a.score;
            }

            return b.focus.bestUpcomingScore - a.focus.bestUpcomingScore
                || a.focus.bestWithinHours - b.focus.bestWithinHours
                || b.score - a.score;
        })
        .slice(0, limit);
}

export function shouldUseUserLocationForFocus(recommendations = [], userLocation = null) {
    if (!userLocation?.lat || !userLocation?.lon || !recommendations.length) return false;

    return isWithinRottnestBounds(userLocation);
}

export function isWithinRottnestBounds(location, bounds = ROTTNEST_BOUNDS) {
    if (!location?.lat || !location?.lon) return false;

    return location.lat <= bounds.north
        && location.lat >= bounds.south
        && location.lon >= bounds.west
        && location.lon <= bounds.east;
}

export function getDistanceKm(lat1, lon1, lat2, lon2) {
    const radius = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getSafetyNotices({ windSpeed, swellHeight, forecastData }) {
    const notices = [];
    if (!forecastData) {
        notices.push('Forecast unavailable. Showing beach guidance with low confidence.');
    }
    if (Number.isFinite(windSpeed) && windSpeed >= 30) {
        notices.push('Strong wind may make entry, exit, and surface swims harder.');
    }
    if (Number.isFinite(swellHeight) && swellHeight >= 1.4) {
        notices.push('Larger swell may reduce visibility and comfort near reefs.');
    }
    if (forecastData && !forecastData.swell_wave_height) {
        notices.push('Marine swell data is unavailable, so recommendations are less certain.');
    }
    return notices;
}

export function formatTime(time) {
    if (!time) return 'Later';
    return new Date(time).toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getState(score, directionMatches, flexibility) {
    if (!directionMatches || score < 42) return 'avoid';
    if (score >= 86 && flexibility >= 6) return 'best';
    if (score >= 66) return 'good';
    return 'watch';
}

function getSummary(state, score) {
    if (state === 'best') return `Excellent window (${score}/100)`;
    if (state === 'good') return `Good option (${score}/100)`;
    if (state === 'watch') return `Use caution (${score}/100)`;
    return `Avoid for now (${score}/100)`;
}

function formatTimelineTime(time) {
    return new Date(time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function getFocusScore(recommendation, forecastData, hourIndex, userLocation, windowHours) {
    const beach = recommendation.beach;
    const endIndex = forecastData?.time?.length
        ? Math.min(forecastData.time.length - 1, hourIndex + windowHours)
        : hourIndex;

    let bestUpcomingScore = recommendation.score;
    let bestWithinHours = 0;
    let bestUpcomingState = recommendation.state;

    for (let index = hourIndex; index <= endIndex; index += 1) {
        const candidate = scoreBeach(beach, getConditions(forecastData, index));
        if (candidate.score > bestUpcomingScore) {
            bestUpcomingScore = candidate.score;
            bestWithinHours = index - hourIndex;
            bestUpcomingState = candidate.state;
        }
    }

    return {
        bestUpcomingScore,
        bestWithinHours,
        bestUpcomingState,
        distanceKm: userLocation && beach.lat && beach.lon
            ? getDistanceKm(userLocation.lat, userLocation.lon, beach.lat, beach.lon)
            : Infinity,
        rank: bestUpcomingScore - (userLocation && beach.lat && beach.lon
            ? getDistanceKm(userLocation.lat, userLocation.lon, beach.lat, beach.lon) * 0.5
            : 0)
    };
}

function toRadians(value) {
    return value * Math.PI / 180;
}

export function formatCompactTime(time, options = {}) {
    if (!time) return '';

    const date = time instanceof Date ? time : new Date(time);
    if (Number.isNaN(date.getTime())) return '';

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const suffix = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    const minuteText = minutes ? `:${String(minutes).padStart(2, '0')}` : '';
    const timeText = `${hour12}${minuteText}${suffix}`;

    if (!options.weekday) return timeText;

    const weekday = date.toLocaleDateString([], { weekday: 'short' });
    if (shouldIncludeDate(date, options.now)) {
        const day = date.getDate();
        const month = date.toLocaleDateString([], { month: 'short' });
        const dateText = `${day} ${month}`;
        return `${weekday} ${dateText} ${timeText}`;
    }

    return `${weekday} ${timeText}`;
}

function shouldIncludeDate(date, now = new Date()) {
    const referenceDate = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(referenceDate.getTime())) return false;

    const startOfToday = new Date(referenceDate);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfThisWeek = new Date(startOfToday);
    endOfThisWeek.setDate(startOfToday.getDate() + 7);

    return date >= endOfThisWeek;
}

export function formatCompactTime(time, options = {}) {
    if (!time) return '';

    const date = time instanceof Date ? time : new Date(time);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const suffix = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    const minuteText = minutes ? `:${String(minutes).padStart(2, '0')}` : '';
    const timeText = `${hour12}${minuteText}${suffix}`;

    if (!options.weekday) return timeText;

    const weekday = date.toLocaleDateString([], { weekday: 'short' });
    return `${weekday} ${timeText}`;
}

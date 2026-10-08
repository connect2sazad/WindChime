/** Compact elapsed time. Month/year labels use 30/365-day approximations. */
export function formatRelativeTime(value, now = Date.now()) {
    if (value == null || value === '') return '—';
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    const current = now instanceof Date ? now.getTime() : Number(now);
    if (!Number.isFinite(timestamp) || !Number.isFinite(current)) return '—';
    const seconds = Math.max(0, Math.floor((current - timestamp) / 1000));
    if (seconds < 60) return 'now';
    const units = [
        [365 * 86400, 'y'],
        [30 * 86400, 'mo'],
        [7 * 86400, 'w'],
        [86400, 'd'],
        [3600, 'h'],
        [60, 'm'],
    ];
    for (const [duration, label] of units) {
        if (seconds >= duration) return `${Math.floor(seconds / duration)}${label}`;
    }
    return 'now';
}

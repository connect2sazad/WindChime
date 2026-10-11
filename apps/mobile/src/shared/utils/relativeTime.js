export default function relativeTime(value, now = Date.now()) {
    if (!value) return '';
    const date = new Date(value).getTime();
    if (!Number.isFinite(date)) return '';
    const seconds = Math.max(0, Math.floor((now - date) / 1000));
    if (seconds < 60) return `${seconds} sec${seconds === 1 ? '' : 's'}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'}`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'}`;
}

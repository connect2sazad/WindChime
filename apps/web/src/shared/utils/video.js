// Pure video helpers: convert seconds for display and keep seeking within valid bounds.
export function videoTime(value) {
    const seconds = Math.floor(Number.isFinite(value) && value > 0 ? value : 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    return (
        (hours ? hours + ':' + String(minutes).padStart(2, '0') : String(minutes)) +
        ':' +
        String(seconds % 60).padStart(2, '0')
    );
}
export function seekPosition(value, duration) {
    return Number.isFinite(value) && Number.isFinite(duration)
        ? Math.min(Math.max(value, 0), Math.max(duration, 0))
        : 0;
}

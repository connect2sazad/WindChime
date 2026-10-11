let muted = false;
const listeners = new Set();

export const getVideosMuted = () => muted;
export const subscribeVideoMute = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export function toggleVideoMute() {
    muted = !muted;
    listeners.forEach((listener) => listener());
    return muted;
}

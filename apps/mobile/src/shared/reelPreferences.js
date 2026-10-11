import * as SecureStore from 'expo-secure-store';

let autoScroll = false;
let userChangedPreference = false;
const listeners = new Set();

SecureStore.getItemAsync('windchime.reel-auto-scroll')
    .then((saved) => {
        if (userChangedPreference || saved == null) return;
        autoScroll = saved === 'true';
        listeners.forEach((listener) => listener());
    })
    .catch(() => {});

export function getReelAutoScroll() { return autoScroll; }
export function subscribeReelAutoScroll(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
export function setReelAutoScroll(value) {
    const next = Boolean(value);
    if (next === autoScroll) return;
    userChangedPreference = true;
    autoScroll = next;
    SecureStore.setItemAsync('windchime.reel-auto-scroll', String(next)).catch(() => {});
    listeners.forEach((listener) => listener());
}
export function toggleReelAutoScroll() { setReelAutoScroll(!autoScroll); }

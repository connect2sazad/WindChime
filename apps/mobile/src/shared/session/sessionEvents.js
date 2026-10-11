const listeners = new Set();

// Authenticated requests notify the session provider when a token has expired.
export function onSessionExpired(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function emitSessionExpired(token) {
    listeners.forEach((listener) => listener(token));
}

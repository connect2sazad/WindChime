import { emitSessionExpired } from '../session/sessionEvents.js';

// Keeps HTTP parsing and service error handling consistent across mobile screens.
export async function apiRequest(base, path, { token, method = 'GET', body, signal, timeoutMs = 12000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
            method,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(body !== undefined && !isFormData ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
            signal: controller.signal,
        });
        if (response.status === 204) return null;
        let result;
        try {
            result = await response.json();
        } catch {
            const error = new Error('The server returned an unreadable response.');
            error.status = response.status;
            throw error;
        }
        if (response.status === 401 && token) emitSessionExpired(token);
        if (!response.ok || result.success !== true) {
            const validationDetails = Array.isArray(result.errors)
                ? result.errors.map((item) => item?.message).filter(Boolean).join(' ')
                : '';
            const error = new Error(
                response.status === 429
                    ? 'Too many attempts. Please wait before trying again.'
                    : [result.message || 'Request failed.', validationDetails].filter(Boolean).join(' '),
            );
            error.status = response.status;
            error.errors = result.errors;
            error.requestId = result.request_id;
            throw error;
        }
        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            const timedOut = !signal?.aborted;
            if (timedOut) throw new Error('The request took too long. Check your connection and try again.', { cause: error });
        }
        if (!signal?.aborted && /fetch failed|failed to fetch|network request failed|request has been canceled/i.test(error.message || '')) {
            throw new Error(`Can't reach the WindChime API at ${base}. On a physical phone, set EXPO_PUBLIC_API_HOST in apps/mobile/.env to this computer's Wi-Fi IPv4 address, keep the API service running, then restart Expo.`, { cause: error });
        }
        throw error;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}

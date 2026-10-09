function requiredApiUrl(name, value) {
    const url = value?.trim();
    if (!url) throw new Error(`Missing required frontend environment variable: ${name}`);
    return url.replace(/\/+$/, '');
}

export const IDENTITY_API = requiredApiUrl('VITE_IDENTITY_API_URL', import.meta.env.VITE_IDENTITY_API_URL);
export const SOCIAL_API = requiredApiUrl('VITE_SOCIAL_API_URL', import.meta.env.VITE_SOCIAL_API_URL);
export const MESSAGES_API = requiredApiUrl('VITE_MESSAGES_API_URL', import.meta.env.VITE_MESSAGES_API_URL);
export const NOTIFICATIONS_API = requiredApiUrl('VITE_NOTIFICATIONS_API_URL', import.meta.env.VITE_NOTIFICATIONS_API_URL);
export async function apiRequest(base, path, { token, method = 'GET', body, signal, timeoutMs = 10000, responseType = 'json' } = {}) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(base.replace(/\/$/, '') + path, {
        method,
        ...(responseType === 'blob' ? { cache: 'no-store', redirect: 'error' } : {}),
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (response.status === 401 && token && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('windchime:session-expired', { detail: token }));
    }
    if (response.status === 204) return null;
    if (response.ok && responseType === 'blob') return response.blob();
    let result;
    try { result = await response.json(); }
    catch {
        const error = new Error('The server returned an unreadable response');
        error.status = response.status;
        throw error;
    }
    if (!response.ok || result.success !== true) {
        const error = new Error(response.status === 429
            ? 'Too many attempts. Please wait before trying again.'
            : result.message || 'Request failed');
        error.status = response.status;
        throw error;
    }
    return result;
}

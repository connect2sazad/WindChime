export const IDENTITY_API = import.meta.env?.VITE_IDENTITY_API_URL || 'http://localhost:3101/api/v1';
export const SOCIAL_API = import.meta.env?.VITE_SOCIAL_API_URL || 'http://localhost:3102/api/v1';

export async function apiRequest(base, path, { token, method = 'GET', body, signal, timeoutMs = 10000, responseType = 'json' } = {}) {
    const timeout = AbortSignal.timeout(timeoutMs);
    const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
    const response = await fetch(base.replace(/\/$/, '') + path, {
        method,
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

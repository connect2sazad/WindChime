import { useEffect, useState } from 'react';
import { login, getCurrentUser, logout } from '../api/index.js';
export default function useSessionController() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [session, setSession] = useState(null);
    const [restoring, setRestoring] = useState(true);
    const [restoreError, setRestoreError] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    // Restore a saved token once at startup; keep it on network errors so users can retry.
    useEffect(() => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let active = true;

        async function restore() {
            try {
                const token = sessionStorage.getItem('windchime_token');
                if (!token) return;

                const user = await getCurrentUser(token, controller.signal);
                if (active) setSession({ user, token });
            } catch (error) {
                if (!active) return;

                if (error.status === 401) {
                    sessionStorage.removeItem('windchime_token');
                    setMessage('Your session expired. Please sign in again.');
                } else {
                    setRestoreError(
                        'We couldn’t verify your session. Check your connection and retry.',
                    );
                }
            } finally {
                clearTimeout(timeout);
                if (active) setRestoring(false);
            }
        }

        restore();

        return () => {
            active = false;
            clearTimeout(timeout);
            controller.abort();
        };
    }, []);

    // The shared API layer signals when a request uses an expired token.
    useEffect(() => {
        // Ignore stale expiry events if they belong to a previous session token.
        function expired(event) {
            if (event.detail !== session?.token) return;
            sessionStorage.removeItem('windchime_token');
            setSession(null);
            setPassword('');
            setLogoutError('');
            setMessage('Your session expired. Please sign in again.');
        }
        window.addEventListener('windchime:session-expired', expired);
        return () => window.removeEventListener('windchime:session-expired', expired);
    }, [session?.token]);

    async function handleSubmit(event) {
        event.preventDefault();
        if (loading) return;

        setLoading(true);
        setMessage('');

        try {
            const result = await login(username.trim(), password);
            sessionStorage.setItem('windchime_token', result.token);
            setSession(result);
            setPassword('');
            setMessage(`Welcome, ${result.user.name}!`);
        } catch (error) {
            setMessage(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Unable to reach sign-in. Please try again.'
                    : error.message,
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        if (!session || loggingOut) return;

        setLoggingOut(true);
        setLogoutError('');

        try {
            await logout(session.token);
            sessionStorage.removeItem('windchime_token');
            setSession(null);
            setPassword('');
            setMessage('You’re signed out.');
        } catch (error) {
            setLogoutError(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not confirm sign-out. Please retry.'
                    : error.message,
            );
        } finally {
            setLoggingOut(false);
        }
    }

    function updateUser(data) {
        setSession((previous) =>
            previous ? { ...previous, user: { ...previous.user, ...data } } : previous,
        );
    }
    return {
        username,
        setUsername,
        password,
        setPassword,
        message,
        loading,
        session,
        restoring,
        restoreError,
        loggingOut,
        logoutError,
        handleSubmit,
        handleLogout,
        updateUser,
    };
}

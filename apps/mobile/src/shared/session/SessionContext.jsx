import { useCallback, useEffect, useMemo, useState } from 'react';
import { clearSession, readSession, saveSession } from './tokenStorage.js';
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from '../../modules/identity/api/auth.js';
import { onSessionExpired } from './sessionEvents.js';
import { SessionContext } from './sessionContext.js';

export function SessionProvider({ children }) {
    const [session, setSession] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        async function restore() {
            try {
                const stored = await readSession();
                if (!stored?.token || !active) return;
                try {
                    const user = await getCurrentUser(stored.token, controller.signal);
                    if (active) setSession({ token: stored.token, user });
                    await saveSession({ token: stored.token, user });
                } catch (error) {
                    // Keep credentials on outages; clear only when the server rejects the token.
                    if (error.status === 401) await clearSession();
                    else if (active) setSession(stored);
                }
            } catch {
                if (active) setSession(null);
            } finally {
                if (active) setReady(true);
            }
        }
        restore();
        return () => {
            active = false;
            controller.abort();
        };
    }, []);

    useEffect(() => onSessionExpired((expiredToken) => {
        setSession((current) => {
            if (current?.token !== expiredToken) return current;
            clearSession().catch(() => {});
            return null;
        });
    }), []);

    const authenticate = useCallback(async (result) => {
        await saveSession(result);
        setSession(result);
        return result.user;
    }, []);

    const signIn = useCallback(async (username, password) => {
        const result = await loginRequest(username.trim(), password);
        return authenticate(result);
    }, [authenticate]);

    const signOut = useCallback(async () => {
        const current = session;
        setSession(null);
        await clearSession();
        if (current?.token) await logoutRequest(current.token);
    }, [session]);

    const value = useMemo(() => ({ session, ready, signIn, authenticate, signOut }), [session, ready, signIn, authenticate, signOut]);
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

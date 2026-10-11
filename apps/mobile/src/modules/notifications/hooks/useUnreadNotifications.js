import { useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '../api/notifications.js';

export default function useUnreadNotifications(token) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!token) return undefined;
        let active = true;
        let timer;
        const poll = async () => {
            try { const next = await getUnreadNotificationCount(token); if (active) setCount(next); }
            catch { /* Keep the last known count during a service outage. */ }
            if (active) timer = setTimeout(poll, 7000);
        };
        poll();
        return () => { active = false; clearTimeout(timer); };
    }, [token]);
    return count;
}

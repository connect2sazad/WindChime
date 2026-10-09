import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../../shared/components/Icon.jsx';
import { unreadCount } from '../api/index.js';
// Small navigation control that refreshes and displays the unread notification count.
export default function NotificationBell({ session }) {
    const [count, setCount] = useState(0);
    const [unavailable, setUnavailable] = useState(false);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    useEffect(() => {
        const controller = new AbortController();
        let loading = false;
        async function load() {
            if (loading || document.hidden) return;
            loading = true;
            try {
                const value = await unreadCount(session.token, controller.signal);
                if (!controller.signal.aborted) {
                    setCount(value);
                    setUnavailable(false);
                }
            } catch {
                if (!controller.signal.aborted) setUnavailable(true);
            } finally {
                loading = false;
            }
        }
        load();
        const timer = setInterval(load, 15000);
        window.addEventListener('windchime:notifications-changed', load);
        document.addEventListener('visibilitychange', load);
        return () => {
            controller.abort();
            clearInterval(timer);
            window.removeEventListener('windchime:notifications-changed', load);
            document.removeEventListener('visibilitychange', load);
        };
    }, [session.token]);
    return (
        <button
            className={
                pathname.startsWith('/notifications')
                    ? 'active wc-notification-bell'
                    : 'wc-notification-bell'
            }
            aria-current={pathname.startsWith('/notifications') ? 'page' : undefined}
            aria-label={
                'Notifications' +
                (unavailable ? ' temporarily unavailable' : count ? ', ' + count + ' unread' : '')
            }
            title={unavailable ? 'Notifications temporarily unavailable' : 'Notifications'}
            onClick={() => navigate('/notifications')}
        >
            <Icon name="bell" />
            <span>Notifications</span>
            {count > 0 && <b className="wc-notification-badge">{count > 99 ? '99+' : count}</b>}
            {unavailable && <i aria-hidden="true">!</i>}
        </button>
    );
}

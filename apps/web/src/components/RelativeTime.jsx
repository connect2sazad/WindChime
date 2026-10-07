import { useEffect, useState } from 'react';
import { formatRelativeTime } from '../utils/formatRelativeTime.js';

export default function RelativeTime({ value, className }) {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);
    const date = value == null || value === '' ? null : new Date(value);
    const valid = date && Number.isFinite(date.getTime());
    return (
        <time className={className}
            dateTime={valid ? date.toISOString() : undefined}
            title={valid ? date.toLocaleString() : 'Unknown date'}>
            {formatRelativeTime(value, now)}
        </time>
    );
}

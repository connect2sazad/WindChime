const COLORS = {
    like: '#467a68', love: '#b95d75', laugh: '#ad8a37',
    sad: '#5b85a0', angry: '#b56b51',
};

export default function ReactionIcon({ name, size = 22, colored = false }) {
    const paths = {
        like: <>
            <path d="M8 10H4v11h4V10Z" />
            <path d="M8 19c2 1 3 2 5 2h4a2 2 0 0 0 2-1.6l1.4-7a2 2 0 0 0-2-2.4H14l.7-4.2A2.5 2.5 0 0 0 12.3 3L8 10" />
        </>,
        love: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
        laugh: <>
            <circle cx="12" cy="12" r="9" />
            <path d="M6.8 9.5q1.7-2 3.4 0M13.8 9.5q1.7-2 3.4 0" />
            <path d="M7 13h10a5 5 0 0 1-10 0Z" />
            <path d="M9 16.8q3-1.5 6 0" />
        </>,
        sad: <>
            <circle cx="12" cy="12" r="9" />
            <path d="M7 8.5l2 1M15 9.5l2-1M8 16q4-4 8 0" />
            <circle cx="8.5" cy="11" r=".65" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="11" r=".65" fill="currentColor" stroke="none" />
            <path d="M17.5 12.5s-1.4 1.8-1.4 2.6a1.4 1.4 0 0 0 2.8 0c0-.8-1.4-2.6-1.4-2.6Z" />
        </>,
        angry: <>
            <circle cx="12" cy="12" r="9" />
            <path d="M6.5 8.5l3.5 2M14 10.5l3.5-2M8 17q4-3 8 0" />
            <circle cx="8.5" cy="12" r=".65" fill="currentColor" stroke="none" />
            <circle cx="15.5" cy="12" r=".65" fill="currentColor" stroke="none" />
        </>,
    };
    return (
        <svg className="wc-reaction-icon" data-reaction={name} width={size} height={size}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            style={colored ? { color: COLORS[name] } : undefined}>
            {paths[name] || paths.like}
        </svg>
    );
}

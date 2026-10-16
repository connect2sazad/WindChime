// Accessible loading placeholders for page and list content.
export default function Skeleton({ variant = 'list', count = 3, className = '' }) {
    if (variant === 'inline') return <span className={`wc-skeleton-label ${className}`} role="status" aria-label="Loading" />;
    return <div className={`wc-skeleton wc-skeleton-${variant} ${className}`} role="status" aria-label="Loading content" aria-busy="true">
        {Array.from({ length: count }, (_, index) => <div className="wc-skeleton-card" key={index}>
            <div className="wc-skeleton-person"><i /><span><b /><b /></span></div>
        {variant === 'feed' ? <i className="wc-skeleton-media" /> : null}
            <i className="wc-skeleton-line long" /><i className="wc-skeleton-line medium" />
        </div>)}
    </div>;
}

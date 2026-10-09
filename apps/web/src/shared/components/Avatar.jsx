// Shared avatar: show the image when available, otherwise use the person’s initials.
export default function Avatar({ name, tone = '', small = false, large = false, src }) {
    const initials = name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
    return (
        <span
            className={`wc-avatar ${tone} ${small ? 'small' : ''} ${large ? 'large' : ''}`}
            aria-hidden="true"
        >
            {src ? <img src={src} alt="" /> : initials}
        </span>
    );
}

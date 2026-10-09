import { useEffect, useId, useRef, useState } from 'react';

export default function CommentOptions({ onDelete, onViewReactions, onReport, disabled, isReply }) {
    const id = useId();
    const trigger = useRef(null);
    const popup = useRef(null);
    const [confirm, setConfirm] = useState(false);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ left: 0, top: 0 });
    useEffect(() => {
        const element = popup.current;
        function changed(event) { setOpen(event.newState === 'open'); }
        function dismiss() { if (element.matches(':popover-open')) element.hidePopover(); }
        element.addEventListener('toggle', changed);
        window.addEventListener('resize', dismiss);
        document.addEventListener('scroll', dismiss, true);
        return () => {
            element.removeEventListener('toggle', changed);
            window.removeEventListener('resize', dismiss);
            document.removeEventListener('scroll', dismiss, true);
            dismiss();
        };
    }, []);

    function toggle() {
        if (popup.current.matches(':popover-open')) { popup.current.hidePopover(); return; }
        const rect = trigger.current.getBoundingClientRect();
        setConfirm(false);
        setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - 248)),
            top: rect.bottom + 160 > window.innerHeight ? Math.max(12, rect.top - 160) : rect.bottom + 5 });
        popup.current.showPopover();
        requestAnimationFrame(() => popup.current.querySelector('button')?.focus());
    }
    function close() { popup.current.hidePopover(); trigger.current?.focus(); }
    return (
        <>
            <button ref={trigger} type="button" className="wc-options-trigger" aria-label="Comment options"
                aria-haspopup="menu" aria-expanded={open} aria-controls={id} disabled={disabled} onClick={toggle}>•••</button>
            <div id={id} ref={popup} popover="auto" className="wc-context-menu" role="menu" aria-label="Comment options"
                style={position} onKeyDown={event => {
                    if (event.key === 'Escape') { event.preventDefault(); close(); }
                    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                        event.preventDefault();
                        const items = [...popup.current.querySelectorAll('button:not(:disabled)')];
                        const current = items.indexOf(document.activeElement);
                        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
                            : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                        items[next]?.focus();
                    }
                }}>
                {confirm ? (
                    <>
                        <p>{isReply ? 'Delete this reply?' : 'Delete this comment and hide its replies?'}</p>
                        <button role="menuitem" type="button" className="danger" disabled={disabled}
                            onClick={() => { close(); onDelete(); }}>Delete</button>
                        <button role="menuitem" type="button" onClick={close}>Cancel</button>
                    </>
                ) : (
                    <>
                        <button role="menuitem" type="button" onClick={() => { close(); onViewReactions(); }}>View reactions</button>
                        {onReport&&<button role="menuitem" type="button" onClick={()=>{close();onReport();}}>Report</button>}{onDelete && <button role="menuitem" type="button" className="danger" onClick={() => setConfirm(true)}>Delete</button>}
                    </>
                )}
            </div>
        </>
    );
}

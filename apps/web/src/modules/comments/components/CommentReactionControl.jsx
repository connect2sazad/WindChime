import ReactionIcon from '../../reactions/Icon.js';
import { useEffect, useRef, useState } from 'react';
import { getCommentReaction, reactToComment } from '../api/index.js';
import { REACTIONS } from '../../reactions/types.js';

export default function CommentReactionControl({ token, postId, commentId, disabled }) {
    const [summary, setSummary] = useState({ counts: {}, total: 0, my_reaction: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const pending = useRef(false);
    const trigger = useRef(null);
    const picker = useRef(null);
    const timer = useRef(null);
    const held = useRef(false);
    const start = useRef(null);
    const [position, setPosition] = useState({ left: 0, top: 0 });
    const selected = REACTIONS.find(item => item.type === summary.my_reaction?.type);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const data = await getCommentReaction(token, postId, commentId, controller.signal);
                if (!controller.signal.aborted) setSummary(data);
            } catch (e) { if (!controller.signal.aborted) setError(e.message); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        load(); return () => controller.abort();
    }, [token, postId, commentId]);
    useEffect(() => {
        const element = picker.current;
        function dismiss() { if (element.matches(':popover-open')) element.hidePopover(); }
        window.addEventListener('resize', dismiss);
        document.addEventListener('scroll', dismiss, true);
        return () => {
            clearTimeout(timer.current);
            window.removeEventListener('resize', dismiss);
            document.removeEventListener('scroll', dismiss, true);
            dismiss();
        };
    }, []);

    function openPicker() {
        const rect = trigger.current.getBoundingClientRect();
        setPosition({left: Math.max(12, Math.min(rect.right-274, window.innerWidth-286)),
            top: rect.top>100 ? rect.top-88 : rect.bottom+8 });
        picker.current.showPopover();
    }
    function stopHold() { clearTimeout(timer.current); }
    function begin(event) {
        if (!event.isPrimary || event.button!==0 || disabled || loading || error) return;
        stopHold();held.current=false;start.current={x:event.clientX,y:event.clientY};
        timer.current=setTimeout(()=>{held.current=true;openPicker();},450);
    }
    function move(event) {
        if(start.current && Math.hypot(event.clientX-start.current.x,event.clientY-start.current.y)>12){stopHold();held.current=true;}
    }
    async function change(type, remove=false) {
        if(pending.current || disabled || loading || error)return;
        pending.current=true;setLoading(true);
        if(picker.current.matches(':popover-open'))picker.current.hidePopover();
        try {
            await reactToComment(token,postId,commentId,remove,type);
            const data=await getCommentReaction(token,postId,commentId);
            setSummary(data);
        }catch{setError('Could not confirm reaction. Reopen comments to retry.');}
        finally{pending.current=false;setLoading(false);}
    }
    function click(event) {
        stopHold();
        if(event.detail===0)held.current=false;
        if(held.current){held.current=false;return;}
        if(picker.current.matches(':popover-open')){picker.current.hidePopover();return;}
        change('like',Boolean(summary.my_reaction));
    }
    return (
        <div className="wc-comment-reaction">
            <button ref={trigger} type="button" className={selected?'wc-comment-react selected':'wc-comment-react'}
                disabled={disabled || loading || Boolean(error)}
                aria-label={selected?`Remove ${selected.label} reaction; hold or press Down Arrow to choose another`:'Like comment; hold or press Down Arrow to choose reaction'}
                aria-pressed={Boolean(selected)} title="Click to like/remove. Hold to choose a reaction."
                onPointerDown={begin} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerMove={move}
                onPointerCancel={()=>{stopHold();held.current=true;}} onContextMenu={event=>event.preventDefault()}
                onClick={click} onKeyDown={event=>{
                    if(event.key==='ArrowDown'){event.preventDefault();openPicker();requestAnimationFrame(()=>picker.current.querySelector('button')?.focus());}
                }}>
                <ReactionIcon name={selected?.icon || 'like'} size={20} colored={Boolean(selected)} />
                {summary.total>0 && <small>{summary.total}</small>}
            </button>
            <div ref={picker} popover="auto" className="wc-comment-reaction-picker" role="group" aria-label="Choose comment reaction" style={position}
                onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();picker.current.hidePopover();trigger.current?.focus();}}}>
                {REACTIONS.map(item=><button key={item.type} type="button" disabled={loading}
                    aria-label={`${item.label}, ${summary.counts[item.type]||0} reactions`} aria-pressed={selected?.type===item.type}
                    title={item.label} onClick={()=>change(item.type)}>
                    <ReactionIcon name={item.icon} size={28} colored /><small>{summary.counts[item.type]||0}</small>
                </button>)}
            </div>
            {error && <span className="wc-comment-reaction-error" role="alert">{error}</span>}
        </div>
    );
}

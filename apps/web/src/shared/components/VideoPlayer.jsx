import { useEffect, useRef, useState } from 'react';
import '../styles/video-player.css';
import { videoTime, seekPosition } from '../utils/video.js';
// Custom accessible player; shared seek helpers keep controls within the video duration.
export default function VideoPlayer({
    src,
    reel = false,
    label = 'Video',
    onError,
    watermark = true,
}) {
    const video = useRef(null);
    const frame = useRef(null);
    const hide = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [busy, setBusy] = useState(false);
    const [shown, setShown] = useState(true);
    const [rate, setRate] = useState(1);
    const [loop, setLoop] = useState(reel);
    const [problem, setProblem] = useState('');
    function reveal() {
        setShown(true);
        clearTimeout(hide.current);
        hide.current = setTimeout(() => setShown(false), 2600);
    }
    function seek(value) {
        const node = video.current;
        if (node && Number.isFinite(node.duration))
            node.currentTime = seekPosition(value, node.duration);
        reveal();
    }
    async function toggle() {
        const node = video.current;
        if (!node) return;
        reveal();
        if (!node.paused) {
            node.pause();
            return;
        }
        try {
            await node.play();
            setProblem('');
        } catch (error) {
            if (error.name !== 'AbortError') setProblem('Playback could not start. Try again.');
        }
    }
    async function fullscreen() {
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else if (frame.current.requestFullscreen) await frame.current.requestFullscreen();
            else if (video.current.webkitEnterFullscreen) video.current.webkitEnterFullscreen();
            else setProblem('Fullscreen is not supported in this browser.');
        } catch {
            setProblem('Fullscreen could not open.');
        }
    }
    useEffect(() => {
        const node = video.current;
        const host = frame.current;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) node.pause();
            },
            { threshold: 0.15 },
        );
        observer.observe(host);
        const visibility = () => {
            if (document.hidden) node.pause();
        };
        const other = (event) => {
            if (event.detail !== node) node.pause();
        };
        document.addEventListener('visibilitychange', visibility);
        window.addEventListener('windchime:video-playing', other);
        return () => {
            node.pause();
            observer.disconnect();
            clearTimeout(hide.current);
            document.removeEventListener('visibilitychange', visibility);
            window.removeEventListener('windchime:video-playing', other);
        };
    }, []);
    function keyboard(event) {
        if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey)
            return;
        const key = event.key.toLowerCase();
        if ([' ', 'k', 'm', 'arrowleft', 'arrowright', 'f'].includes(key)) event.preventDefault();
        if (key === ' ' || key === 'k') toggle();
        if (key === 'm') setMuted((value) => !value);
        if (key === 'arrowleft') seek(video.current.currentTime - 5);
        if (key === 'arrowright') seek(video.current.currentTime + 5);
        if (key === 'f') fullscreen();
    }
    const visible = shown || !playing || busy || !!problem;
    return (
        <section
            ref={frame}
            className={
                'wc-player' + (reel ? ' wc-player-reel' : '') + (visible ? ' is-visible' : '')
            }
            aria-label={label + ' player'}
            tabIndex={0}
            onKeyDown={keyboard}
            onPointerMove={reveal}
            onFocus={reveal}
            onContextMenu={(event) => event.preventDefault()}
        >
            <video
                ref={video}
                src={src}
                playsInline
                preload="metadata"
                muted={muted}
                loop={loop}
                controlsList="nodownload noremoteplayback"
                disablePictureInPicture
                disableRemotePlayback
                draggable={false}
                aria-label={label}
                onClick={toggle}
                onLoadedMetadata={(event) => {
                    setDuration(
                        Number.isFinite(event.currentTarget.duration)
                            ? event.currentTarget.duration
                            : 0,
                    );
                    setTime(0);
                }}
                onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
                onWaiting={() => setBusy(true)}
                onCanPlay={() => setBusy(false)}
                onPlaying={() => setBusy(false)}
                onPlay={() => {
                    setPlaying(true);
                    window.dispatchEvent(
                        new CustomEvent('windchime:video-playing', { detail: video.current }),
                    );
                    reveal();
                }}
                onPause={() => {
                    setPlaying(false);
                    setBusy(false);
                }}
                onEnded={() => setPlaying(false)}
                onError={() => {
                    setBusy(false);
                    setProblem('This video could not be played. Try H.264 MP4 or WebM.');
                    onError?.();
                }}
            />
            {watermark && (
                <span className="wc-player-brand" aria-hidden="true">
                    windchime <span>✳</span>
                </span>
            )}
            {reel && <span className="wc-player-kind">Reel · a little moment</span>}
            {!playing && !problem && (
                <button
                    type="button"
                    className="wc-player-start"
                    onClick={toggle}
                    aria-label={time >= duration && duration ? 'Replay video' : 'Play video'}
                >
                    {time >= duration && duration ? '↺' : '▶'}
                </button>
            )}
            {busy && (
                <span className="wc-player-loading" role="status">
                    Loading video…
                </span>
            )}
            {problem && (
                <p className="wc-player-problem" role="alert">
                    {problem}
                </p>
            )}
            <div className="wc-player-controls" onPointerDown={reveal}>
                <div className="wc-player-timeline">
                    <span>{videoTime(time)}</span>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={Math.min(time, duration || 0)}
                        disabled={!duration}
                        aria-label="Video progress"
                        aria-valuetext={videoTime(time) + ' of ' + videoTime(duration)}
                        onChange={(event) => seek(Number(event.target.value))}
                    />
                    <span>{videoTime(duration)}</span>
                </div>
                <div className="wc-player-toolbar">
                    <button
                        type="button"
                        onClick={toggle}
                        aria-label={playing ? 'Pause video' : 'Play video'}
                        title={playing ? 'Pause (K)' : 'Play (K)'}
                    >
                        {playing ? 'Ⅱ' : '▶'}
                    </button>
                    <button
                        type="button"
                        onClick={() => seek(video.current.currentTime - 5)}
                        aria-label="Back 5 seconds"
                        title="Back 5 seconds"
                    >
                        −5
                    </button>
                    <button
                        type="button"
                        onClick={() => seek(video.current.currentTime + 5)}
                        aria-label="Forward 5 seconds"
                        title="Forward 5 seconds"
                    >
                        +5
                    </button>
                    <button
                        type="button"
                        onClick={() => setMuted((value) => !value)}
                        aria-label={muted ? 'Unmute video' : 'Mute video'}
                        aria-pressed={!muted}
                        title={muted ? 'Sound off (M)' : 'Sound on (M)'}
                    >
                        {muted ? 'Sound off' : 'Sound on'}
                    </button>
                    <input
                        className="wc-player-volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={muted ? 0 : volume}
                        aria-label="Volume"
                        onChange={(event) => {
                            const value = Number(event.target.value);
                            video.current.volume = value;
                            setVolume(value);
                            setMuted(value === 0);
                        }}
                    />
                    <select
                        aria-label="Playback speed"
                        value={rate}
                        onChange={(event) => {
                            const value = Number(event.target.value);
                            video.current.playbackRate = value;
                            setRate(value);
                        }}
                    >
                        {[0.5, 1, 1.5, 2].map((value) => (
                            <option key={value} value={value}>
                                {value}×
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="wc-player-loop"
                        aria-label="Loop video"
                        aria-pressed={loop}
                        title="Loop video"
                        onClick={() => setLoop((value) => !value)}
                    >
                        ↻
                    </button>
                    <button
                        type="button"
                        onClick={fullscreen}
                        aria-label="Toggle fullscreen"
                        title="Fullscreen (F)"
                    >
                        ⛶
                    </button>
                </div>
            </div>
        </section>
    );
}

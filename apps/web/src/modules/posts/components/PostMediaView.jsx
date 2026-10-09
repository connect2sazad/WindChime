import { useEffect, useRef, useState } from 'react';
import VideoPlayer from '../../../shared/components/VideoPlayer.jsx';
import { getMediaBlob } from '../api/index.js';
import PhotoViewer from './PhotoViewer.jsx';
import { slideFromScroll } from '../utils/photos.js';
function MediaItem({
    item,
    postId,
    token,
    reel,
    eager = false,
    onSize,
    number = 1,
    total = 1,
    onExpand,
}) {
    const [singleViewer, setSingleViewer] = useState(null);
    const container = useRef(null);
    const [visible, setVisible] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '300px' },
        );
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);
    const shouldLoad = visible || eager;
    useEffect(() => {
        if (!shouldLoad) return;
        const controller = new AbortController();
        let objectUrl = '';
        async function load() {
            try {
                const blob = await getMediaBlob(token, postId, item.id, controller.signal);
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(blob);
                setUrl(objectUrl);
            } catch (e) {
                if (!controller.signal.aborted) setError(e.message);
            }
        }
        load();
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [shouldLoad, token, postId, item.id]);
    return (
        <>
            <div ref={container} className="wc-media-item">
                {error ? (
                    <p className="wc-media-error" role="alert">
                        {error}
                    </p>
                ) : !url ? (
                    <div className="wc-media-loading" role="status">
                        {visible || eager ? 'Loading ' + item.kind + '…' : 'Photo ' + number}
                    </div>
                ) : item.kind === 'video' ? (
                    <VideoPlayer src={url} reel={reel} label={reel ? 'Reel' : 'Post video'} />
                ) : (
                    <button
                        type="button"
                        className="wc-photo-open"
                        aria-label={'Enlarge photo ' + number + ' of ' + total}
                        onClick={() => (onExpand ? onExpand(url) : setSingleViewer(url))}
                    >
                        <img
                            src={url}
                            alt={'Post photo ' + number + ' of ' + total}
                            draggable={false}
                            loading="lazy"
                            onLoad={(event) =>
                                onSize?.(
                                    event.currentTarget.naturalWidth,
                                    event.currentTarget.naturalHeight,
                                )
                            }
                            onError={() => setError('Image could not be displayed')}
                        />
                        <span className="wc-photo-enlarge-hint" aria-hidden="true">
                            ⤢ Enlarge
                        </span>
                    </button>
                )}
            </div>
            {singleViewer && (
                <PhotoViewer
                    media={[item]}
                    postId={postId}
                    token={token}
                    initialIndex={0}
                    initialUrl={singleViewer}
                    onClose={() => setSingleViewer(null)}
                />
            )}
        </>
    );
}
function PhotoCarousel({ media, post, token }) {
    const track = useRef(null);
    const [active, setActive] = useState(0);
    const [ratio, setRatio] = useState(0.8);
    const near = useRef(0);
    const total = media.length;
    const [viewer, setViewer] = useState(null);
    const [visited, setVisited] = useState(() => new Set([0, 1]));
    function prepare(index) {
        setVisited((previous) => {
            const values = [index - 1, index, index + 1].filter(
                (value) => value >= 0 && value < total,
            );
            if (values.every((value) => previous.has(value))) return previous;
            return new Set([...previous, ...values]);
        });
    }
    function go(index) {
        const node = track.current;
        if (!node) return;
        prepare(index);
        node.scrollTo({
            left: index * node.clientWidth,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'instant'
                : 'smooth',
        });
    }
    function keyboard(event) {
        if (event.target !== event.currentTarget) return;
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) event.preventDefault();
        if (event.key === 'ArrowLeft') go(Math.max(0, active - 1));
        if (event.key === 'ArrowRight') go(Math.min(total - 1, active + 1));
        if (event.key === 'Home') go(0);
        if (event.key === 'End') go(total - 1);
    }
    useEffect(() => {
        const node = track.current;
        const observer = new ResizeObserver(() =>
            node.scrollTo({ left: near.current * node.clientWidth, behavior: 'instant' }),
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    return (
        <>
            <section
                className="wc-photo-carousel"
                aria-label="Post photo carousel"
                aria-roledescription="carousel"
            >
                <div
                    ref={track}
                    className="wc-photo-track"
                    style={{ aspectRatio: ratio }}
                    tabIndex={0}
                    onKeyDown={keyboard}
                    onScroll={(event) => {
                        const index = slideFromScroll(
                            event.currentTarget.scrollLeft,
                            event.currentTarget.clientWidth,
                            total,
                        );
                        near.current = index;
                        setActive(index);
                        prepare(index);
                    }}
                >
                    {media.map((item, index) => (
                        <div
                            className="wc-photo-slide"
                            role="group"
                            aria-roledescription="slide"
                            aria-label={index + 1 + ' of ' + total}
                            key={item.id}
                        >
                            {visited.has(index) ? (
                                <MediaItem
                                    item={item}
                                    postId={post.id}
                                    token={token}
                                    eager={true}
                                    onExpand={(url) => setViewer({ index, url })}
                                    number={index + 1}
                                    total={total}
                                    onSize={
                                        index === 0
                                            ? (width, height) =>
                                                  setRatio(
                                                      Math.min(1, Math.max(0.5625, width / height)),
                                                  )
                                            : undefined
                                    }
                                />
                            ) : (
                                <div className="wc-media-loading">Photo {index + 1}</div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="wc-photo-controls">
                    <button
                        type="button"
                        disabled={active === 0}
                        aria-label="Previous photo"
                        onClick={() => go(active - 1)}
                    >
                        ←
                    </button>
                    <div className="wc-photo-position">
                        <span aria-live="polite" aria-atomic="true">
                            Photo <strong>{String(active + 1).padStart(2, '0')}</strong> /{' '}
                            {String(total).padStart(2, '0')}
                        </span>
                        <div className="wc-photo-progress" aria-label="Choose a photo">
                            {media.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-label={'Go to photo ' + (index + 1)}
                                    aria-current={index === active ? 'true' : undefined}
                                    onClick={() => go(index)}
                                >
                                    <i />
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={active === total - 1}
                        aria-label="Next photo"
                        onClick={() => go(active + 1)}
                    >
                        →
                    </button>
                </div>
            </section>
            {viewer && (
                <PhotoViewer
                    media={media}
                    postId={post.id}
                    token={token}
                    initialIndex={viewer.index}
                    initialUrl={viewer.url}
                    onClose={() => setViewer(null)}
                    onIndex={go}
                />
            )}
        </>
    );
}
// Chooses the correct viewer for post media and manages photo-carousel navigation.
export default function PostMediaView({ post, token }) {
    const media = [...(post.media || [])].sort((a, b) => a.sort_order - b.sort_order);
    if (!media.length) return null;
    const resource = token + ':' + post.id + ':' + media.map((item) => item.id).join(',');
    if (media.length > 1 && media.every((item) => item.kind === 'image'))
        return <PhotoCarousel key={resource} media={media} post={post} token={token} />;
    return (
        <div className={'wc-post-media ' + (post.kind === 'reel' ? 'reel' : '')}>
            {media.map((item, index) => (
                <MediaItem
                    key={token + ':' + post.id + ':' + item.id}
                    item={item}
                    postId={post.id}
                    token={token}
                    reel={post.kind === 'reel'}
                    number={index + 1}
                    total={media.length}
                />
            ))}
        </div>
    );
}

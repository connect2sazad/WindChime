import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getMediaBlob } from '../api/index.js';
import { isBackdropClick } from '../../../shared/utils/dialog.js';
// Full-screen photo viewer with keyboard navigation and protected image loading.
export default function PhotoViewer({
    media,
    postId,
    token,
    initialIndex,
    initialUrl,
    onClose,
    onIndex,
}) {
    const dialog = useRef(null);
    const [index, setIndex] = useState(initialIndex);
    const [image, setImage] = useState({ index: initialIndex, url: initialUrl });
    const [zoom, setZoom] = useState(false);
    const [error, setError] = useState('');
    const mediaId = media[index]?.id;
    useEffect(() => {
        const node = dialog.current;
        const focus = document.activeElement;
        node.showModal();
        return () => {
            node.close();
            if (focus?.isConnected) focus.focus();
        };
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl = '';
        async function load() {
            try {
                if (index === initialIndex) {
                    setImage({ index, url: initialUrl });
                    setError('');
                    return;
                }
                const blob = await getMediaBlob(token, postId, mediaId, controller.signal);
                if (controller.signal.aborted) return;
                objectUrl = URL.createObjectURL(blob);
                setImage({ index, url: objectUrl });
                setError('');
            } catch (e) {
                if (!controller.signal.aborted) setError(e.message);
            }
        }
        load();
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [index, initialIndex, initialUrl, mediaId, postId, token]);
    function go(value) {
        setZoom(false);
        setError('');
        setIndex(value);
        onIndex?.(value);
    }
    const url = image.index === index ? image.url : null;
    return createPortal(
        <dialog
            ref={dialog}
            className="wc-photo-viewer"
            aria-labelledby="photo-viewer-title"
            onCancel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose();
            }}
            onClick={(event) => {
                if (isBackdropClick(event)) onClose();
            }}
            onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' && index > 0) {
                    event.preventDefault();
                    go(index - 1);
                }
                if (event.key === 'ArrowRight' && index < media.length - 1) {
                    event.preventDefault();
                    go(index + 1);
                }
            }}
        >
            <header>
                <div>
                    <strong id="photo-viewer-title">A closer look</strong>
                    <span aria-live="polite">
                        Photo {index + 1} of {media.length}
                    </span>
                </div>
                <div>
                    <button
                        type="button"
                        disabled={!url || !!error}
                        aria-pressed={zoom}
                        onClick={() => setZoom((value) => !value)}
                    >
                        {zoom ? 'Fit photo' : 'Zoom in'}
                    </button>
                    <button type="button" aria-label="Close photo viewer" onClick={onClose}>
                        ×
                    </button>
                </div>
            </header>
            <div className={'wc-photo-viewer-canvas' + (zoom ? ' is-zoomed' : '')} tabIndex={0}>
                {error ? (
                    <p role="alert">{error}</p>
                ) : url ? (
                    <img
                        src={url}
                        alt={'Post photo ' + (index + 1) + ' of ' + media.length}
                        draggable={false}
                        onError={() => setError('This photo could not be displayed.')}
                    />
                ) : (
                    <p role="status">Loading photo…</p>
                )}
            </div>
            {media.length > 1 && (
                <footer>
                    <button
                        disabled={index === 0}
                        onClick={() => go(index - 1)}
                        aria-label="Previous enlarged photo"
                    >
                        ← Previous
                    </button>
                    <span>
                        {zoom ? 'Scroll to explore the photo' : 'Use the arrows to explore'}
                    </span>
                    <button
                        disabled={index === media.length - 1}
                        onClick={() => go(index + 1)}
                        aria-label="Next enlarged photo"
                    >
                        Next →
                    </button>
                </footer>
            )}
        </dialog>,
        document.body,
    );
}

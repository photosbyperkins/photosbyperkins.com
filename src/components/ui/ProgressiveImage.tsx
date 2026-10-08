import { useState, useRef, useEffect, useCallback } from 'react';
import { withBuild } from '../../utils/build';
import { loadedSrcs } from './progressiveImageCache';

type ProgressiveImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
    placeholder?: string | null;
    objectPosition?: string;
    priority?: boolean;
    aspectRatio?: string;
};

type ObserverCallback = () => void;
let sharedObserver: IntersectionObserver | null = null;
let currentObserverClass: typeof IntersectionObserver | null = null;
const observerCallbacks = new Map<Element, ObserverCallback>();

function getSharedObserver(): IntersectionObserver | null {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return null;
    if (!sharedObserver || currentObserverClass !== window.IntersectionObserver) {
        currentObserverClass = window.IntersectionObserver;
        observerCallbacks.clear();
        sharedObserver = new window.IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        if (entry.target) {
                            const cb = observerCallbacks.get(entry.target);
                            if (cb) {
                                observerCallbacks.delete(entry.target);
                                sharedObserver?.unobserve(entry.target);
                                cb();
                            }
                        } else {
                            const allEntries = Array.from(observerCallbacks.entries());
                            for (const [el, cb] of allEntries) {
                                observerCallbacks.delete(el);
                                sharedObserver?.unobserve(el);
                                cb();
                            }
                        }
                    }
                }
            },
            { rootMargin: '400px' }
        );
    }
    return sharedObserver;
}

function observeElement(el: Element, cb: ObserverCallback): () => void {
    const observer = getSharedObserver();
    if (!observer) {
        cb();
        return () => {};
    }
    observerCallbacks.set(el, cb);
    observer.observe(el);
    return () => {
        observerCallbacks.delete(el);
        observer.unobserve(el);
    };
}

export default function ProgressiveImage({
    src,
    alt,
    placeholder,
    className,
    style,
    objectPosition,
    priority = false,
    aspectRatio = '3 / 2',
    onLoad,
    ...props
}: ProgressiveImageProps) {
    const [isLoaded, setIsLoaded] = useState(() => Boolean(src && loadedSrcs.has(src)));
    const [prevSrc, setPrevSrc] = useState(src);
    const [shouldLoad, setShouldLoad] = useState(() => priority || Boolean(src && loadedSrcs.has(src)));
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reset or restore loaded state when src changes (e.g. recycled row in virtualized grid)
    if (src !== prevSrc) {
        setPrevSrc(src);
        const cached = Boolean(src && loadedSrcs.has(src));
        setIsLoaded(cached);
        if (cached) {
            setShouldLoad(true);
        }
    }

    useEffect(() => {
        if (priority || shouldLoad || !containerRef.current) return;

        return observeElement(containerRef.current, () => {
            setShouldLoad(true);
        });
    }, [shouldLoad, priority]);

    // Check if image is already cached / completed
    useEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            if (src) loadedSrcs.add(src);
            setIsLoaded(true);
        }
    }, [shouldLoad, src]);

    const handleLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            if (src) loadedSrcs.add(src);
            setIsLoaded(true);
            onLoad?.(e);
        },
        [onLoad, src]
    );

    const imageSrc = shouldLoad && src ? withBuild(src) : undefined;
    const placeholderSrc = placeholder ? withBuild(placeholder) : null;

    return (
        <div
            ref={containerRef}
            className={`progressive-image ${className || ''}`}
            style={{
                aspectRatio,
                position: 'relative',
                overflow: 'hidden',
                ...style,
            }}
        >
            {placeholderSrc && !isLoaded && (
                <img
                    src={placeholderSrc}
                    alt=""
                    aria-hidden="true"
                    className="progressive-image__placeholder"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: objectPosition || 'center',
                    }}
                />
            )}
            <img
                ref={imgRef}
                src={imageSrc}
                alt={alt || ''}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                fetchPriority={priority ? 'high' : 'auto'}
                width="600"
                height="400"
                onLoad={handleLoad}
                className={`progressive-image__img ${isLoaded ? 'is-loaded' : ''}`}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: objectPosition || 'center',
                }}
                {...props}
            />
        </div>
    );
}

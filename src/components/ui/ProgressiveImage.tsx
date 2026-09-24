import { useState, useRef, useEffect, useCallback } from 'react';

declare const __BUILD_NUMBER__: string;

type ProgressiveImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
    placeholder?: string | null;
    objectPosition?: string;
    priority?: boolean;
    aspectRatio?: string;
};

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
    const [isLoaded, setIsLoaded] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(priority);
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        if (priority || shouldLoad || !containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoad(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '400px' }
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [shouldLoad, priority]);

    // Check if image is already cached / completed
    useEffect(() => {
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
            setIsLoaded(true);
        }
    }, [shouldLoad, src]);

    const handleLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
            setIsLoaded(true);
            onLoad?.(e);
        },
        [onLoad]
    );

    const imageSrc = shouldLoad && src ? (src.includes('?v=') ? src : `${src}?v=${__BUILD_NUMBER__}`) : undefined;
    const placeholderSrc = placeholder
        ? placeholder.includes('?v=')
            ? placeholder
            : `${placeholder}?v=${__BUILD_NUMBER__}`
        : null;

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
                // @ts-expect-error fetchpriority attribute is supported in modern browsers
                fetchpriority={priority ? 'high' : 'auto'}
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


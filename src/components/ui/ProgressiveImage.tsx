import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

type ProgressiveImageProps = Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'
>;

export default function ProgressiveImage({
    src,
    alt,
    placeholder,
    className,
    style,
    objectPosition,
    ...props
}: ProgressiveImageProps & { placeholder?: string | null; objectPosition?: string }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current || shouldLoad) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldLoad(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`progressive-image ${className || ''}`}
            style={{ ...style, position: 'relative', overflow: 'hidden' }}
        >
            {placeholder && !isLoaded && (
                <img
                    src={`${placeholder}?v=${__BUILD_NUMBER__}`}
                    alt=""
                    className="progressive-image__placeholder"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: objectPosition || 'center',
                        filter: 'blur(10px)',
                        transform: 'scale(1.1)',
                    }}
                />
            )}
            <motion.img
                src={shouldLoad && src ? `${src}?v=${__BUILD_NUMBER__}` : undefined}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: isLoaded ? 1 : 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="progressive-image__img"
                style={{ position: 'relative', zIndex: 1, objectPosition: objectPosition || 'center' }}
                {...props}
                key={src || 'empty'}
            />
        </div>
    );
}

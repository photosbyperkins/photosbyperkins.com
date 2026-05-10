import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        setSize({ width: el.offsetWidth, height: el.offsetHeight });

        let rafId = 0;
        const observer = new ResizeObserver((entries) => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                for (const entry of entries) {
                    const w = entry.contentBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
                    const h = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
                    setSize({ width: w, height: h });
                }
            });
        });

        observer.observe(el);

        return () => {
            cancelAnimationFrame(rafId);
            observer.disconnect();
        };
    }, [ref]);

    return size;
}

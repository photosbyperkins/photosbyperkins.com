import { useEffect } from 'react';

export function useBodyScrollLock(lock: boolean = true) {
    useEffect(() => {
        if (!lock) return;

        const originalOverflow = document.body.style.overflow;
        const originalTouchAction = document.body.style.touchAction;
        const originalPaddingRight = document.body.style.paddingRight;

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';

        return () => {
            document.body.style.overflow = originalOverflow;
            document.body.style.touchAction = originalTouchAction;
            document.body.style.paddingRight = originalPaddingRight;
        };
    }, [lock]);
}

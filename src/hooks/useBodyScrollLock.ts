import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';
let originalTouchAction = '';
let originalPaddingRight = '';

export function useBodyScrollLock(lock: boolean = true) {
    useEffect(() => {
        if (!lock) return;

        if (lockCount === 0) {
            originalOverflow = document.body.style.overflow === 'hidden' ? '' : document.body.style.overflow;
            originalTouchAction = document.body.style.touchAction === 'none' ? '' : document.body.style.touchAction;
            originalPaddingRight = document.body.style.paddingRight;

            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }

            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        }
        lockCount++;

        return () => {
            lockCount--;
            if (lockCount <= 0) {
                lockCount = 0;
                document.body.style.overflow = originalOverflow;
                document.body.style.touchAction = originalTouchAction;
                document.body.style.paddingRight = originalPaddingRight;
            }
        };
    }, [lock]);
}

import { useState } from 'react';

export function useCanShare() {
    const [canShare] = useState(() => {
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            const nav = navigator as Navigator & { userAgentData?: { mobile: boolean }; share?: unknown };
            const isIpadOS = navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1;

            if (nav.userAgentData !== undefined) {
                return !!nav.share && (nav.userAgentData.mobile || isIpadOS);
            }

            return (
                !!nav.share &&
                (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || isIpadOS)
            );
        }
        return false;
    });

    return canShare;
}

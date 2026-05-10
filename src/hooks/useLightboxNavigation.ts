import { useEffect } from 'react';

interface UseLightboxNavigationProps {
    onClose: () => void;
    onPaginate: (direction: number) => void;
    isZoomed: boolean;
    isActive?: boolean;
}

export function useLightboxNavigation({ onClose, onPaginate, isZoomed, isActive = true }: UseLightboxNavigationProps) {
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onPaginate(-1);
            if (e.key === 'ArrowRight') onPaginate(1);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onPaginate, isActive]);

    useEffect(() => {
        if (!isActive) return;

        let wheelCooldown = false;

        const handleWheel = (e: WheelEvent) => {
            if (isZoomed || wheelCooldown) return;

            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) < 10) return;

            e.preventDefault();
            wheelCooldown = true;
            onPaginate(delta > 0 ? 1 : -1);

            setTimeout(() => {
                wheelCooldown = false;
            }, 400);
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [onPaginate, isZoomed, isActive]);
}

import { useEffect } from 'react';

interface UseLightboxNavigationProps {
    onClose: () => void;
    onPaginate: (direction: number) => void;
    isZoomed: boolean;
    isActive?: boolean;
    onToggleFavorite?: () => void;
    onToggleZoom?: () => void;
    onToggleTheater?: () => void;
    onDownload?: () => void;
    onToggleHelp?: () => void;
}

export function useLightboxNavigation({
    onClose,
    onPaginate,
    isZoomed,
    isActive = true,
    onToggleFavorite,
    onToggleZoom,
    onToggleTheater,
    onDownload,
    onToggleHelp,
}: UseLightboxNavigationProps) {
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore keystrokes if focused inside an input/textarea
            if (
                document.activeElement instanceof HTMLInputElement ||
                document.activeElement instanceof HTMLTextAreaElement
            ) {
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                onPaginate(-1);
            } else if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                onPaginate(1);
            } else if (e.key === 'f' || e.key === 'F' || e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                onToggleFavorite?.();
            } else if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                onToggleZoom?.();
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                onToggleTheater?.();
            } else if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                onDownload?.();
            } else if (e.key === '?') {
                e.preventDefault();
                onToggleHelp?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onPaginate, isActive, onToggleFavorite, onToggleZoom, onToggleTheater, onDownload, onToggleHelp]);

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

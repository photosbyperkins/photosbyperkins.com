import { useEffect } from 'react';

interface UseLightboxNavigationProps {
    onClose: () => void;
    onPaginate: (direction: number) => void;
    isZoomed: boolean;
    isActive?: boolean;
    isAnimating?: boolean;
    onToggleFavorite?: () => void;
    onToggleZoom?: () => void;
    onToggleTheater?: () => void;
    onDownload?: () => void;
    onToggleHelp?: () => void;
    onOpenStoryExport?: () => void;
}

export function useLightboxNavigation({
    onClose,
    onPaginate,
    isZoomed,
    isActive = true,
    isAnimating = false,
    onToggleFavorite,
    onToggleZoom,
    onToggleTheater,
    onDownload,
    onToggleHelp,
    onOpenStoryExport,
}: UseLightboxNavigationProps) {
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Never hijack browser or OS keyboard shortcuts (Ctrl+C, Ctrl+F, Ctrl+D, etc.)
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }

            // Ignore keystrokes if focused inside form inputs or editable elements
            const active = document.activeElement;
            if (
                active instanceof HTMLInputElement ||
                active instanceof HTMLTextAreaElement ||
                active instanceof HTMLSelectElement ||
                (active as HTMLElement)?.isContentEditable
            ) {
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            // Block slide navigation and secondary actions mid-slide, but allow Escape above
            if (isAnimating) {
                return;
            }

            if (e.key === 'ArrowLeft') {
                if (isZoomed) return;
                e.preventDefault();
                onPaginate(-1);
            } else if (e.key === 'ArrowRight') {
                if (isZoomed) return;
                e.preventDefault();
                onPaginate(1);
            } else if (e.key === ' ') {
                if (isZoomed) return;
                // If a button is focused, allow native button activation instead of paginating
                if (active instanceof HTMLButtonElement || active?.getAttribute('role') === 'button') {
                    return;
                }
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
            } else if (e.key === 'c' || e.key === 'C') {
                e.preventDefault();
                onOpenStoryExport?.();
            } else if (e.key === '?') {
                e.preventDefault();
                onToggleHelp?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        onClose,
        onPaginate,
        isZoomed,
        isActive,
        isAnimating,
        onToggleFavorite,
        onToggleZoom,
        onToggleTheater,
        onDownload,
        onToggleHelp,
        onOpenStoryExport,
    ]);

    useEffect(() => {
        if (!isActive) return;

        let wheelCooldown = false;

        const handleWheel = (e: WheelEvent) => {
            if (isZoomed || wheelCooldown || isAnimating) return;

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
    }, [onPaginate, isZoomed, isActive, isAnimating]);
}

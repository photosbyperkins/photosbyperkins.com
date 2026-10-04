import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLightboxNavigation } from './useLightboxNavigation';

describe('useLightboxNavigation', () => {
    let onClose = vi.fn<() => void>();
    let onPaginate = vi.fn<(direction: number) => void>();
    let onToggleFavorite = vi.fn<() => void>();
    let onToggleZoom = vi.fn<() => void>();
    let onToggleTheater = vi.fn<() => void>();
    let onDownload = vi.fn<() => void>();
    let onToggleHelp = vi.fn<() => void>();
    let onOpenStoryExport = vi.fn<() => void>();

    beforeEach(() => {
        onClose = vi.fn<() => void>();
        onPaginate = vi.fn<(direction: number) => void>();
        onToggleFavorite = vi.fn<() => void>();
        onToggleZoom = vi.fn<() => void>();
        onToggleTheater = vi.fn<() => void>();
        onDownload = vi.fn<() => void>();
        onToggleHelp = vi.fn<() => void>();
        onOpenStoryExport = vi.fn<() => void>();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('triggers onClose on Escape key', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
            })
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('navigates with ArrowLeft, ArrowRight, and Space', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
            })
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        expect(onPaginate).toHaveBeenCalledWith(-1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(onPaginate).toHaveBeenCalledWith(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        expect(onPaginate).toHaveBeenCalledWith(1);
    });

    it('handles shortcut keys: f, z, t, d, c, and ?', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
                onToggleFavorite,
                onToggleZoom,
                onToggleTheater,
                onDownload,
                onToggleHelp,
                onOpenStoryExport,
            })
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
        expect(onToggleFavorite).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'L' }));
        expect(onToggleFavorite).toHaveBeenCalledTimes(2);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        expect(onToggleZoom).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
        expect(onToggleTheater).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
        expect(onDownload).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
        expect(onOpenStoryExport).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
        expect(onToggleHelp).toHaveBeenCalledTimes(1);
    });

    it('ignores keystrokes when isActive is false', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
                isActive: false,
            })
        );

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(onPaginate).not.toHaveBeenCalled();
    });

    it('ignores keystrokes when focus is inside an input or textarea', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
            })
        );

        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(onPaginate).not.toHaveBeenCalled();

        document.body.removeChild(input);
    });

    it('handles mouse wheel pagination when not zoomed', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
            })
        );

        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 50 }));
        expect(onPaginate).toHaveBeenCalledWith(1);

        // Small delta ignored
        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 5 }));
        expect(onPaginate).toHaveBeenCalledTimes(1);
    });

    it('ignores mouse wheel pagination when isZoomed is true', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: true,
            })
        );

        window.dispatchEvent(new WheelEvent('wheel', { deltaY: 50 }));
        expect(onPaginate).not.toHaveBeenCalled();
    });

    it('ignores keystrokes when modifier keys (ctrl, meta, alt) are held', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
                onOpenStoryExport,
                onToggleFavorite,
            })
        );

        // Ctrl+C (copy) should NOT open story export
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', ctrlKey: true }));
        expect(onOpenStoryExport).not.toHaveBeenCalled();

        // Meta+F (find) should NOT toggle favorite
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', metaKey: true }));
        expect(onToggleFavorite).not.toHaveBeenCalled();

        // Alt+ArrowRight should NOT paginate
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true }));
        expect(onPaginate).not.toHaveBeenCalled();
    });

    it('does not paginate on Space if a button is focused', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
            })
        );

        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        expect(onPaginate).not.toHaveBeenCalled();

        document.body.removeChild(button);
    });

    it('ignores keystrokes when focus is in select or contentEditable', () => {
        renderHook(() =>
            useLightboxNavigation({
                onClose,
                onPaginate,
                isZoomed: false,
            })
        );

        const select = document.createElement('select');
        document.body.appendChild(select);
        select.focus();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
        expect(onToggleFavorite).not.toHaveBeenCalled();
        document.body.removeChild(select);

        const editable = document.createElement('div');
        editable.contentEditable = 'true';
        document.body.appendChild(editable);
        editable.focus();

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
        expect(onToggleZoom).not.toHaveBeenCalled();
        document.body.removeChild(editable);
    });
});

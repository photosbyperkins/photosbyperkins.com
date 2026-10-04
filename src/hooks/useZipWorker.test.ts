import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useZipWorker } from './useZipWorker';

describe('useZipWorker', () => {
    let activeWorkerInstance: MockWorker | null = null;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    const setActiveInstance = (instance: MockWorker) => {
        activeWorkerInstance = instance;
    };

    class MockWorker {
        postMessage = vi.fn();
        terminate = vi.fn();
        onmessage: ((e: MessageEvent) => void) | null = null;
        onerror: ((err: ErrorEvent) => void) | null = null;

        constructor() {
            setActiveInstance(this);
        }
    }

    beforeEach(() => {
        activeWorkerInstance = null;
        window.Worker = MockWorker as unknown as typeof Worker;
        URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
        URL.revokeObjectURL = vi.fn();
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    });

    afterEach(() => {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        vi.restoreAllMocks();
    });

    it('initializes with idle state', () => {
        const { result } = renderHook(() => useZipWorker());
        expect(result.current.isZipping).toBe(false);
        expect(result.current.zipProgress).toBe(0);
    });

    it('does not start zipping when urls are empty', () => {
        const { result } = renderHook(() => useZipWorker());

        act(() => {
            result.current.startZipping([], 'test.zip');
        });

        expect(result.current.isZipping).toBe(false);
        expect(activeWorkerInstance).toBeNull();
    });

    it('updates progress on progress message and resets on done message', () => {
        const { result } = renderHook(() => useZipWorker());

        act(() => {
            result.current.startZipping(['/photos/1.jpg'], 'album.zip');
        });

        expect(result.current.isZipping).toBe(true);
        expect(activeWorkerInstance).not.toBeNull();
        expect(activeWorkerInstance?.postMessage).toHaveBeenCalledWith({
            urls: ['/photos/1.jpg'],
            filename: 'album.zip',
        });

        // Simulate progress message
        act(() => {
            activeWorkerInstance?.onmessage?.({
                data: { type: 'progress', progress: 45 },
            } as MessageEvent);
        });

        expect(result.current.zipProgress).toBe(45);

        // Simulate done message
        act(() => {
            activeWorkerInstance?.onmessage?.({
                data: { type: 'done', blob: new Blob(['data']), filename: 'album.zip' },
            } as MessageEvent);
        });

        expect(result.current.zipProgress).toBe(100);
        expect(activeWorkerInstance?.terminate).toHaveBeenCalled();
    });

    it('terminates worker on error message', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = renderHook(() => useZipWorker());

        act(() => {
            result.current.startZipping(['/photos/1.jpg'], 'album.zip');
        });

        act(() => {
            activeWorkerInstance?.onmessage?.({
                data: { type: 'error', error: 'Zip generation failed' },
            } as MessageEvent);
        });

        expect(result.current.isZipping).toBe(false);
        expect(activeWorkerInstance?.terminate).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith('Zip error:', 'Zip generation failed');
        errorSpy.mockRestore();
    });
});

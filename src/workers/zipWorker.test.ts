import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('zipWorker', () => {
    let workerHandler: ((e: MessageEvent<{ urls: string[]; filename: string }>) => Promise<void>) | null = null;
    const postMessageSpy = vi.fn();
    const originalFetch = globalThis.fetch;

    beforeEach(async () => {
        postMessageSpy.mockClear();
        // Setup self for worker context
        (globalThis as unknown as { postMessage: typeof postMessageSpy }).postMessage = postMessageSpy;

        // Dynamically import worker after self is configured
        await import('./zipWorker');
        workerHandler = (globalThis as unknown as { onmessage: typeof workerHandler }).onmessage;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it('processes batch of images, reports progress, and emits done with zip blob', async () => {
        const dummyBytes = new Uint8Array([1, 2, 3, 4]);

        globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
            return {
                ok: true,
                arrayBuffer: async () => dummyBytes.buffer,
            } as unknown as Response;
        });

        const event = {
            data: {
                urls: [
                    '/photos/2026-event/original/action_01.jpg',
                    '/photos/2026-event/original/action_02.jpg',
                ],
                filename: 'photos.zip',
            },
        } as MessageEvent<{ urls: string[]; filename: string }>;

        await workerHandler!(event);

        // Check progress messages
        const progressMessages = postMessageSpy.mock.calls
            .map((c) => c[0])
            .filter((m) => m.type === 'progress');
        expect(progressMessages.length).toBeGreaterThan(0);
        expect(progressMessages.some((m) => m.progress === 100)).toBe(true);

        // Check done message
        const doneMessage = postMessageSpy.mock.calls
            .map((c) => c[0])
            .find((m) => m.type === 'done');
        expect(doneMessage).toBeDefined();
        expect(doneMessage.filename).toBe('photos.zip');
        expect(doneMessage.blob).toBeInstanceOf(Blob);
    });

    it('deduplicates filenames with identical names', async () => {
        const dummyBytes = new Uint8Array([1, 2, 3]);

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: async () => dummyBytes.buffer,
        } as unknown as Response);

        const event = {
            data: {
                urls: [
                    '/photos/bout/image.jpg',
                    '/photos/bout/image.jpg',
                ],
                filename: 'duplicates.zip',
            },
        } as MessageEvent<{ urls: string[]; filename: string }>;

        await workerHandler!(event);

        const doneMessage = postMessageSpy.mock.calls
            .map((c) => c[0])
            .find((m) => m.type === 'done');
        expect(doneMessage).toBeDefined();
    });

    it('falls back to AVIF when original JPG fails', async () => {
        const dummyBytes = new Uint8Array([10, 20]);

        globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
            const url = input.toString();
            if (url.endsWith('.jpg')) {
                return { ok: false, status: 404 } as unknown as Response;
            }
            if (url.includes('/avif/') && url.endsWith('.avif')) {
                return {
                    ok: true,
                    arrayBuffer: async () => dummyBytes.buffer,
                } as unknown as Response;
            }
            return { ok: false, status: 404 } as unknown as Response;
        });

        const event = {
            data: {
                urls: ['/photos/2026/photo.jpg'],
                filename: 'avif-fallback.zip',
            },
        } as MessageEvent<{ urls: string[]; filename: string }>;

        await workerHandler!(event);

        const doneMessage = postMessageSpy.mock.calls
            .map((c) => c[0])
            .find((m) => m.type === 'done');
        expect(doneMessage).toBeDefined();
    });

    it('falls back to WebP when both original JPG and AVIF fail', async () => {
        const dummyBytes = new Uint8Array([30, 40]);

        globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
            const url = input.toString();
            if (url.endsWith('.jpg') || url.endsWith('.avif')) {
                return { ok: false, status: 404 } as unknown as Response;
            }
            if (url.includes('/webp/') && url.endsWith('.webp')) {
                return {
                    ok: true,
                    arrayBuffer: async () => dummyBytes.buffer,
                } as unknown as Response;
            }
            return { ok: false, status: 404 } as unknown as Response;
        });

        const event = {
            data: {
                urls: ['/photos/2026/photo.jpg'],
                filename: 'webp-fallback.zip',
            },
        } as MessageEvent<{ urls: string[]; filename: string }>;

        await workerHandler!(event);

        const doneMessage = postMessageSpy.mock.calls
            .map((c) => c[0])
            .find((m) => m.type === 'done');
        expect(doneMessage).toBeDefined();
    });

    it('posts error if all photos fail to download', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        } as unknown as Response);

        const event = {
            data: {
                urls: ['/photos/nonexistent.jpg'],
                filename: 'failed.zip',
            },
        } as MessageEvent<{ urls: string[]; filename: string }>;

        await workerHandler!(event);

        const errorMessage = postMessageSpy.mock.calls
            .map((c) => c[0])
            .find((m) => m.type === 'error');
        expect(errorMessage).toBeDefined();
        expect(errorMessage.error).toContain('Failed to download photos for zip compression.');
    });

    it('enforces 1GB safety cap and reports error when exceeded', async () => {
        const OriginalUint8Array = globalThis.Uint8Array;
        const fakeUint8 = { byteLength: 600 * 1024 * 1024 };
        // @ts-expect-error mock Uint8Array constructor
        globalThis.Uint8Array = class {
            constructor() {
                return fakeUint8;
            }
        };

        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            arrayBuffer: async () => new ArrayBuffer(1),
        } as unknown as Response);

        const event = {
            data: {
                urls: ['/photos/huge1.jpg', '/photos/huge2.jpg'],
                filename: 'huge.zip',
            },
        } as MessageEvent<{ urls: string[]; filename: string }>;

        try {
            await workerHandler!(event);
        } finally {
            globalThis.Uint8Array = OriginalUint8Array;
        }

        const errorMessage = postMessageSpy.mock.calls
            .map((c) => c[0])
            .find((m) => m.type === 'error');
        expect(errorMessage).toBeDefined();
        expect(errorMessage.error).toContain('Total album size exceeds browser in-memory limit');
    });
});

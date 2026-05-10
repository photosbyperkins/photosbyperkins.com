import { useState, useRef, useEffect, useCallback } from 'react';

export function useZipWorker() {
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);
    const zipWorkerRef = useRef<Worker | null>(null);

    // Terminate the zip worker on unmount to prevent leaks
    useEffect(() => {
        return () => {
            zipWorkerRef.current?.terminate();
        };
    }, []);

    const startZipping = useCallback(
        (urls: string[], filename: string = 'Favorites.zip') => {
            if (isZipping || urls.length === 0) return;

            setIsZipping(true);
            setZipProgress(0);

            const worker = new Worker(new URL('../workers/zipWorker.ts', import.meta.url), { type: 'module' });
            zipWorkerRef.current = worker;

            worker.onmessage = (e) => {
                if (e.data.type === 'progress') {
                    setZipProgress(Math.round(e.data.progress));
                } else if (e.data.type === 'done') {
                    const { blob, filename: outFilename } = e.data;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = outFilename;
                    a.click();
                    URL.revokeObjectURL(url);

                    setZipProgress(100);
                    setTimeout(() => {
                        setIsZipping(false);
                        setZipProgress(0);
                    }, 1500);

                    worker.terminate();
                    zipWorkerRef.current = null;
                } else if (e.data.type === 'error') {
                    console.error('Zip error:', e.data.error);
                    setIsZipping(false);
                    worker.terminate();
                    zipWorkerRef.current = null;
                }
            };

            worker.postMessage({ urls, filename });
        },
        [isZipping]
    );

    return { isZipping, zipProgress, startZipping };
}

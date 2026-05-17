import * as fflate from 'fflate';

self.onmessage = async (e: MessageEvent<{ urls: string[]; filename: string }>) => {
    const { urls, filename } = e.data;

    try {
        let count = 0;
        const usedNames = new Set<string>();
        const files: Record<string, Uint8Array> = {};

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const pathParts = url.split('/');
            const originalFilename = pathParts.pop() || `photo_${i}.jpg`;
            const parentDir = pathParts.pop();
            const eventDir =
                parentDir === 'original' || parentDir === 'web' || parentDir === 'thumb' ? pathParts.pop() : parentDir;

            let name = eventDir ? `${eventDir}_${originalFilename}` : originalFilename;

            if (usedNames.has(name)) {
                const parts = name.split('.');
                const ext = parts.length > 1 ? `.${parts.pop()}` : '';
                const base = parts.join('.');
                let counter = 1;
                while (usedNames.has(`${base} (${counter})${ext}`)) {
                    counter++;
                }
                name = `${base} (${counter})${ext}`;
            }
            usedNames.add(name);

            files[name] = uint8Array;
            count++;
            self.postMessage({ type: 'progress', progress: (count / urls.length) * 80 }); // Fetching takes majority of time
        }

        // Generate zip synchronously in worker thread
        const zipped = fflate.zipSync(files, { level: 0 }); // Level 0: Store only

        self.postMessage({ type: 'progress', progress: 100 });
        const blob = new Blob([zipped as unknown as BlobPart], { type: 'application/zip' });
        self.postMessage({ type: 'done', blob, filename });
    } catch (error) {
        self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

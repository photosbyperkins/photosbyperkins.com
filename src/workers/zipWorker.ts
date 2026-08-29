import * as fflate from 'fflate';

self.onmessage = async (e: MessageEvent<{ urls: string[]; filename: string }>) => {
    const { urls, filename } = e.data;

    try {
        const outChunks: Uint8Array[] = [];
        let errorOccurred: Error | null = null;

        const zip = new fflate.Zip((err, chunk, final) => {
            if (err) {
                errorOccurred = err;
                return;
            }
            outChunks.push(chunk);
            if (final) {
                self.postMessage({ type: 'progress', progress: 100 });
                const blob = new Blob(outChunks as unknown as BlobPart[], { type: 'application/zip' });
                self.postMessage({ type: 'done', blob, filename });
            }
        });

        const usedNames = new Set<string>();

        for (let i = 0; i < urls.length; i++) {
            if (errorOccurred) throw errorOccurred;

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

            // Stream file to zip without retaining memory
            const fileStream = new fflate.ZipPassThrough(name);
            zip.add(fileStream);
            fileStream.push(uint8Array, true);

            self.postMessage({ type: 'progress', progress: Math.round(((i + 1) / urls.length) * 95) });
        }

        zip.end();
    } catch (error) {
        self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};


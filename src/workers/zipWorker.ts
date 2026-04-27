import JSZip from 'jszip';

self.onmessage = async (e: MessageEvent<{ urls: string[]; filename: string }>) => {
    const { urls, filename } = e.data;
    const zip = new JSZip();

    try {
        let count = 0;
        const usedNames = new Set<string>();

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            const blob = await response.blob();

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

            zip.file(name, blob);
            count++;
            self.postMessage({ type: 'progress', progress: (count / urls.length) * 50 });
        }

        const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            self.postMessage({ type: 'progress', progress: 50 + metadata.percent / 2 });
        });

        self.postMessage({ type: 'done', blob: content, filename });
    } catch (error) {
        self.postMessage({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
    }
};

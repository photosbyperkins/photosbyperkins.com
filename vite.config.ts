import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'
import type { Connect, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// Custom middleware to serve the /photos directory without bundling it
function photosMiddleware(): { name: string; configureServer: (server: ViteDevServer) => void } {
    let urlMap: Map<string, string> | null = null;

    return {
        name: 'serve-photos',
        configureServer(server) {
            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
                if (req.url && (req.url.startsWith('/photos/') || req.url.startsWith('/thumbnails/') || req.url.startsWith('/webp/') || req.url.startsWith('/zips/'))) {
                    // Lazy load the map of post-normalized URLs to pre-normalized disk paths
                    if (!urlMap) {
                        urlMap = new Map();
                        try {
                            const dataFile = path.join(process.cwd(), 'data', 'photos.json');
                            if (fs.existsSync(dataFile)) {
                                const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
                                for (const year in data) {
                                    for (const event in data[year]) {
                                        const ev = data[year][event];
                                        const photos = [...(ev.album || []), ...(ev.highlights || [])];
                                        for (const p of photos) {
                                            if (p.original && p.source) {
                                                urlMap.set(p.original, p.source);
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Failed to load photos.json for middleware mapping', e);
                        }
                    }

                    let relativePath = decodeURIComponent(req.url.split('?')[0]);

                    // Map it back to the original un-normalized disk folder path during local dev
                    if (relativePath.startsWith('/photos/') && urlMap.has(relativePath)) {
                        relativePath = urlMap.get(relativePath)!;
                    }

                    // Strip leading slash for safe join
                    const safeRelative = relativePath.replace(/^\//, '');
                    let filePath;
                    if (safeRelative.startsWith('thumbnails/')) {
                        filePath = path.join(process.cwd(), 'build', safeRelative);
                    } else if (safeRelative.startsWith('webp/')) {
                        filePath = path.join(process.cwd(), 'build', safeRelative);
                    } else if (safeRelative.startsWith('zips/')) {
                        filePath = path.join(process.cwd(), 'build', safeRelative);
                    } else {
                        filePath = path.join(process.cwd(), safeRelative);
                    }

                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        let contentType = 'image/jpeg';
                        if (relativePath.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
                        if (relativePath.toLowerCase().endsWith('.zip')) contentType = 'application/zip';
                        
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'public, max-age=86400');
                        fs.createReadStream(filePath).pipe(res);
                        return;
                    }
                }
                next();
            });
        }
    }
}

const buildJsonPath = path.resolve(__dirname, 'build.json');
let buildNumber = '0';

try {
    const buildData = JSON.parse(fs.readFileSync(buildJsonPath, 'utf8'));
    buildData.buildNumber = (buildData.buildNumber || 0) + 1;
    fs.writeFileSync(buildJsonPath, JSON.stringify(buildData, null, 2));
    buildNumber = buildData.buildNumber.toString();
    console.log(`Build number incremented to: ${buildNumber}`);
} catch (err) {
    console.error('Failed to update build number:', err);
    buildNumber = Date.now().toString(); // Fallback to timestamp if file fails
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            react(),
            photosMiddleware(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png'],
                manifest: {
                    name: env.VITE_PWA_NAME || 'Photography Portfolio',
                    short_name: env.VITE_PWA_SHORT_NAME || 'Portfolio',
                    description: env.VITE_PWA_DESC || 'Photography Portfolio',
                    theme_color: env.VITE_PWA_THEME_COLOR || '#1a1a1a',
                icons: [
                    {
                        src: 'apple-touch-icon.png',
                        sizes: '180x180',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                cleanupOutdatedCaches: true,
                globPatterns: ['**/*.{js,css,ico,png,svg,html}'], // Included html to guarantee atomic updates with JS chunks
                navigateFallback: '/index.html',
                navigateFallbackDenylist: [/^\/zips\//],
                runtimeCaching: [
                    {
                        urlPattern: /\/data\/.*\.json$/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'json-data-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                            },
                        },
                    },
                    {
                        urlPattern: /\/(?:photos|thumbnails)\/.*\.(?:png|jpg|jpeg|svg|webp|avif)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 2000,
                                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                            },
                        },
                    }
                ]
            }
        }),
        {
            name: 'html-transform',
            transformIndexHtml(html) {
                return html.replace(/%BUILD_NUMBER%/g, buildNumber);
            },
        },
    ],
    define: {
        __BUILD_NUMBER__: JSON.stringify(buildNumber),
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: false,
        // Photos are NOT bundled – they are served separately.
        // For production (BlueHost), run `node scripts/generatePhotoIndex.js` then
        // build with `npm run build`. Upload the `dist` folder + the `photos` folder
        // to your BlueHost public_html. The site references /photos/* from the root.
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                        return 'vendor';
                    }
                    if (id.includes('node_modules/framer-motion/')) {
                        return 'motion';
                    }
                },
                assetFileNames: (assetInfo) => {
                    const info = assetInfo.name?.split('.') || [];
                    const extType = info[info.length - 1];
                    if (/woff2?|eot|ttf|otf/i.test(extType)) {
                        return `assets/fonts/[name][extname]`; // Unhashed, stable fonts
                    }
                    return `assets/[name]-[hash][extname]`;
                }
            }
        }
    },
    server: {
        port: 5173,
        open: true,
    }
    }
})

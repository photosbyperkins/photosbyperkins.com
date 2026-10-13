import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import type { Connect, Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// Custom middleware to serve the /photos directory without bundling it
function photosMiddleware(): { name: string; configureServer: (server: ViteDevServer) => void } {
    let urlMap: Map<string, string> | null = null;

    return {
        name: 'serve-photos',
        configureServer(server) {
            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
                if (req.url && (req.url.startsWith('/photos/') || req.url.startsWith('/thumbnails/') || req.url.startsWith('/scrubber/') || req.url.startsWith('/recap/') || req.url.startsWith('/webp/') || req.url.startsWith('/avif/') || req.url.startsWith('/zips/'))) {
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
                    const buildSubdirs = ['thumbnails', 'scrubber', 'recap', 'webp', 'avif', 'zips'] as const;
                    const matchedBuildSubdir = buildSubdirs.find((dir) => safeRelative.startsWith(`${dir}/`));

                    let filePath: string;
                    let allowedRoot: string;
                    if (matchedBuildSubdir) {
                        filePath = path.join(process.cwd(), 'build', safeRelative);
                        allowedRoot = path.resolve(process.cwd(), 'build', matchedBuildSubdir);
                    } else {
                        filePath = path.join(process.cwd(), safeRelative);
                        allowedRoot = path.resolve(process.cwd(), 'photos');
                    }

                    // Security: prevent directory traversal outside the target media root
                    const resolvedPath = path.resolve(filePath);
                    if (!resolvedPath.startsWith(allowedRoot + path.sep)) {
                        res.statusCode = 403;
                        res.end('Forbidden');
                        return;
                    }

                    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
                        let contentType = 'image/jpeg';
                        if (relativePath.toLowerCase().endsWith('.webp')) contentType = 'image/webp';
                        if (relativePath.toLowerCase().endsWith('.avif')) contentType = 'image/avif';
                        if (relativePath.toLowerCase().endsWith('.zip')) contentType = 'application/zip';
                        
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'public, max-age=86400');
                        fs.createReadStream(resolvedPath).pipe(res);
                        return;
                    }
                }
                next();
            });
        }
    }
}

const bundleReportDir = path.resolve(import.meta.dirname, 'reports', 'bundle');

// Records the JS/CSS emitted by *this* build for scripts/checkBundleBudget.ts. dist keeps stale
// media/share files around (emptyOutDir: false), so we clean dist/assets before each build and
// record the emitted chunk manifest.
function bundleChunkManifest(): Plugin {
    return {
        name: 'bundle-chunk-manifest',
        apply: 'build',
        buildStart() {
            const assetsDir = path.resolve(import.meta.dirname, 'dist', 'assets');
            if (fs.existsSync(assetsDir)) {
                fs.rmSync(assetsDir, { recursive: true, force: true });
            }
        },
        generateBundle(_options, bundle) {
            const files = Object.values(bundle)
                .map((output) => output.fileName)
                .filter((fileName) => /\.(?:js|css)$/.test(fileName))
                .sort();
            fs.mkdirSync(bundleReportDir, { recursive: true });
            fs.writeFileSync(path.join(bundleReportDir, 'chunks.json'), JSON.stringify({ files }, null, 2));
        },
    };
}

const buildJsonPath = path.resolve(import.meta.dirname, 'build.json');
let buildNumber = '0';

try {
    if (!fs.existsSync(buildJsonPath)) {
        fs.writeFileSync(buildJsonPath, JSON.stringify({ buildNumber: 0 }, null, 2));
    }
    const buildData = JSON.parse(fs.readFileSync(buildJsonPath, 'utf8'));
    const isTest = Boolean(process.env.VITEST || process.env.NODE_ENV === 'test');
    const isBuildCommand = process.argv.some(arg => arg === 'build' || arg.endsWith('build.ts'));
    if (!isTest && isBuildCommand) {
        buildData.buildNumber = (buildData.buildNumber || 0) + 1;
        fs.writeFileSync(buildJsonPath, JSON.stringify(buildData, null, 2));
        console.log(`Build number incremented to: ${buildData.buildNumber}`);
    }
    buildNumber = (buildData.buildNumber || 0).toString();
} catch {
    buildNumber = '0';
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            react(),
            photosMiddleware(),
            bundleChunkManifest(),
            {
                ...visualizer({
                    filename: path.join(bundleReportDir, 'stats.html'),
                    title: 'Photos by Perkins: bundle report',
                    template: 'treemap',
                    gzipSize: true,
                    brotliSize: true,
                }),
                apply: 'build',
            } as Plugin,
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
                    ],
                    shortcuts: [
                        {
                            name: "Search Teams",
                            short_name: "Search",
                            description: "Search for teams and events",
                            url: "/portfolio?search=true",
                            icons: [{ src: "favicon.svg", sizes: "any" }]
                        }
                    ]
                },
            workbox: {
                cleanupOutdatedCaches: true,
                globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'], // Omit html and legacy woff
                globIgnores: ['**/StoryExportModal-*', '**/src-*.js', '**/zipWorker-*', '**/*.woff'],
                navigateFallback: null,
                runtimeCaching: [
                    {
                        urlPattern: ({ request, url }: { request: Request; url: URL }) => {
                            if (request.mode !== 'navigate') return false;
                            const p = url.pathname;
                            return !p.startsWith('/zips/') &&
                                   !p.startsWith('/share/') &&
                                   !p.startsWith('/photos/') &&
                                   !p.startsWith('/thumbnails/') &&
                                   !p.startsWith('/avif/') &&
                                   !p.startsWith('/webp/') &&
                                   !p.startsWith('/scrubber/') &&
                                   !p.startsWith('/recap/') &&
                                   !p.startsWith('/data/') &&
                                   !p.startsWith('/assets/');
                        },
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'navigation-cache',
                            networkTimeoutSeconds: 3,
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /\/data\/.*\.json(?:\?.*)?$/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'json-data-cache',
                            networkTimeoutSeconds: 3,
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
                            },
                        },
                    },
                    {
                        urlPattern: /\/(?:photos|thumbnails|scrubber|recap|webp|avif)\/.*\.(?:png|jpg|jpeg|svg|webp|avif)(?:\?.*)?$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: {
                                maxEntries: 2000,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                                purgeOnQuotaError: true
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            }
                        },
                    }
                ]
            }
        }),
        {
            name: 'html-transform',
            transformIndexHtml(html) {
                let transformed = html.replace(/%BUILD_NUMBER%/g, buildNumber);
                try {
                    const indexPath = path.join(process.cwd(), 'public', 'data', 'index.json');
                    if (fs.existsSync(indexPath)) {
                        const indexContent = fs.readFileSync(indexPath, 'utf8').trim();
                        const parsed = JSON.parse(indexContent);
                        const latestYear = parsed.years && parsed.years[0];
                        if (latestYear) {
                            let recapHash: string | undefined;
                            try {
                                const yearPath = path.join(process.cwd(), 'public', 'data', 'years', `${latestYear}.json`);
                                recapHash = JSON.parse(fs.readFileSync(yearPath, 'utf8')).recapHash;
                            } catch {
                                recapHash = undefined;
                            }
                            const preloads = [
                                `<script>window.__INITIAL_INDEX__ = ${indexContent.replace(/</g, '\\u003c')};</script>`,
                                `<link rel="preload" href="/data/years/${latestYear}.json?build=${buildNumber}" as="fetch" crossorigin />`,
                            ];
                            // Only preload when the exact URL Recap will request is known; a mismatch would download it twice.
                            if (recapHash) {
                                preloads.push(
                                    `<link rel="preload" href="/recap/${latestYear}/sprite.webp?h=${recapHash}" as="image" type="image/webp" />`
                                );
                            }
                            transformed = transformed.replace('</head>', `  ${preloads.join('\n  ')}\n</head>`);
                        }
                    }
                } catch (e) {
                    console.error('Failed to inject preloads in html-transform:', e);
                }
                return transformed;
            },
        },
    ],
    define: {
        __BUILD_NUMBER__: JSON.stringify(buildNumber),
    },
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
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
    },
    test: {
        environment: 'happy-dom',
        environmentOptions: {
            happyDOM: {
                settings: {
                    navigation: {
                        disableChildFrameNavigation: true
                    }
                }
            }
        },
        isolate: true,
        exclude: ['e2e/**', 'node_modules/**']
    }
    }
})

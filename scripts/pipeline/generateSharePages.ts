import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { IndexState } from './types.js';
import { logger } from './logger.js';

const DIST_DIR = path.join(process.cwd(), 'dist');
const BASE_URL = `https://${process.env.VITE_SITE_DOMAIN || 'localhost'}`;
const APP_TITLE = process.env.VITE_SITE_APP_TITLE || 'Photography Portfolio';

export async function generateSharePages(data: IndexState) {
    logger.header('Generating static share pages for OpenGraph...');

    let count = 0;

    for (const year in data) {
        for (const event in data[year]) {
            const eventData = data[year][event];
            let firstImgPath = '';

            if (eventData.highlights && eventData.highlights.length > 0) {
                const img = eventData.highlights[0];
                firstImgPath = typeof img === 'string' ? img : img.thumb || img.original;
            } else if (eventData.album && eventData.album.length > 0) {
                const img = eventData.album[0];
                firstImgPath = typeof img === 'string' ? img : img.thumb || img.original;
            }

            // Use the pre-generated OpenGraph social card instead of the raw thumbnail
            let ogImgUrl = '';
            if (firstImgPath) {
                const socialCardPath = `/social-cards/${encodeURIComponent(year)}_${encodeURIComponent(event)}.webp`;
                ogImgUrl = `${BASE_URL}${socialCardPath}`;
            }

            const targetUrl = `${BASE_URL}/?year=${encodeURIComponent(year)}&event=${encodeURIComponent(event)}`;

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${event} - ${APP_TITLE}</title>
    
    <!-- OpenGraph Meta Tags -->
    <meta property="og:title" content="${event} - ${APP_TITLE}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${BASE_URL}/share/${encodeURIComponent(year)}/${encodeURIComponent(event)}" />
    ${ogImgUrl ? `<meta property="og:image" content="${ogImgUrl}" />` : ''}
    <meta property="og:description" content="View the photo gallery for ${event} on ${APP_TITLE}." />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${event} - ${APP_TITLE}">
    <meta name="twitter:description" content="View the photo gallery for ${event}.">
    ${ogImgUrl ? `<meta name="twitter:image" content="${ogImgUrl}">` : ''}

    <!-- Fallback Redirection -->
    <meta http-equiv="refresh" content="0; url=${targetUrl}" />
    <script>
        window.location.replace("${targetUrl}");
    </script>
</head>
<body>
    <p>Redirecting to <a href="${targetUrl}">${event}</a>...</p>
</body>
</html>`;

            const shareDir = path.join(DIST_DIR, 'share', encodeURIComponent(year), encodeURIComponent(event));
            fs.mkdirSync(shareDir, { recursive: true });

            fs.writeFileSync(path.join(shareDir, 'index.html'), html);
            count++;
        }
    }

    logger.success(`Generated ${count} share pages.`);
}

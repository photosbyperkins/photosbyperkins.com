import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import type { IndexState } from './types';
import { logger } from './logger.js';

const DIST_DIR = path.join(process.cwd(), 'dist');
const BASE_URL = `https://${process.env.VITE_SITE_DOMAIN || 'localhost'}`;
const APP_TITLE = process.env.VITE_SITE_APP_TITLE || 'Photography Portfolio';

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

            const photoCount = eventData.photoCount || eventData.album?.length || 0;
            const jsonLd = {
                '@context': 'https://schema.org',
                '@type': 'ImageGallery',
                'name': `${event} — ${year}`,
                'description': `Photo gallery for ${event} (${year}) on ${APP_TITLE}.`,
                'url': `${BASE_URL}/share/${encodeURIComponent(year)}/${encodeURIComponent(event)}`,
                'numberOfItems': photoCount,
                ...(ogImgUrl ? { 'image': ogImgUrl } : {}),
                'publisher': {
                    '@type': 'Organization',
                    'name': APP_TITLE,
                    'url': BASE_URL,
                },
            };

            const safeTitle = escapeHtml(`${event} - ${APP_TITLE}`);
            const safeEvent = escapeHtml(event);
            const safeAppTitle = escapeHtml(APP_TITLE);
            const safeTargetUrl = escapeHtml(targetUrl);
            const shareUrl = `${BASE_URL}/share/${encodeURIComponent(year)}/${encodeURIComponent(event)}`;

            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${safeTitle}</title>
    
    <!-- OpenGraph Meta Tags -->
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${shareUrl}" />
    ${ogImgUrl ? `<meta property="og:image" content="${ogImgUrl}" />` : ''}
    <meta property="og:description" content="View the photo gallery for ${safeEvent} on ${safeAppTitle}." />
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="View the photo gallery for ${safeEvent}.">
    ${ogImgUrl ? `<meta name="twitter:image" content="${ogImgUrl}">` : ''}

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

    <!-- Fallback Redirection -->
    <meta http-equiv="refresh" content="0; url=${safeTargetUrl}" />
    <script>
        window.location.replace(${JSON.stringify(targetUrl)});
    </script>
</head>
<body>
    <p>Redirecting to <a href="${safeTargetUrl}">${safeEvent}</a>...</p>
</body>
</html>`;

            const shareDir = path.join(DIST_DIR, 'share', year, event);
            fs.mkdirSync(shareDir, { recursive: true });

            fs.writeFileSync(path.join(shareDir, 'index.html'), html);
            count++;
        }
    }

    logger.success(`Generated ${count} share pages.`);
}

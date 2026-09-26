import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import type { IndexState } from './types';
import { logger } from './logger.js';

const DIST_DIR = path.join(process.cwd(), 'dist');
const BASE_URL = `https://${process.env.VITE_SITE_DOMAIN || 'localhost'}`;

function xmlEscape(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export async function generateSitemap(data: IndexState) {
    logger.header('Generating sitemap.xml...');

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Root URL
    xml += `  <url>\n`;
    xml += `    <loc>${xmlEscape(BASE_URL)}/</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // Process each year and event
    for (const year in data) {
        // Year overview page
        xml += `  <url>\n`;
        xml += `    <loc>${xmlEscape(`${BASE_URL}/portfolio/${encodeURIComponent(year)}`)}</loc>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        xml += `  </url>\n`;

        for (const event in data[year]) {
            // Canonical portfolio event route
            const canonicalEventUrl = `${BASE_URL}/portfolio/${encodeURIComponent(year)}/${encodeURIComponent(event)}`;
            xml += `  <url>\n`;
            xml += `    <loc>${xmlEscape(canonicalEventUrl)}</loc>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;

            // Share page for OpenGraph and social scrapers
            const shareUrl = `${BASE_URL}/share/${encodeURIComponent(year)}/${encodeURIComponent(event)}`;
            xml += `  <url>\n`;
            xml += `    <loc>${xmlEscape(shareUrl)}</loc>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.6</priority>\n`;
            xml += `  </url>\n`;
        }
    }

    xml += `</urlset>`;

    const sitemapPath = path.join(DIST_DIR, 'sitemap.xml');

    // Ensure dist exists
    if (!fs.existsSync(DIST_DIR)) {
        fs.mkdirSync(DIST_DIR, { recursive: true });
    }

    fs.writeFileSync(sitemapPath, xml);
    logger.success(`Wrote ${sitemapPath}`);
}

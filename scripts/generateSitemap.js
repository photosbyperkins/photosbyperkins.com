import fs from 'fs';
import path from 'path';

const INDEX_FILE = path.join(process.cwd(), 'data', 'photos.json');
const DIST_DIR = path.join(process.cwd(), 'dist');
const BASE_URL = 'https://photosbyperkins.com';

function generateSitemap() {
    console.log('🗺️ Generating sitemap.xml...');

    if (!fs.existsSync(INDEX_FILE)) {
        console.error('Error: photos.json not found. Run "npm run index" first.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Root URL
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // Process each year and event
    for (const year in data) {
        for (const event in data[year]) {
            const url = `${BASE_URL}/?year=${encodeURIComponent(year)}&amp;event=${encodeURIComponent(event)}`;
            xml += `  <url>\n`;
            xml += `    <loc>${url}</loc>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.8</priority>\n`;
            xml += `  </url>\n`;

            // Generate entries for share pages to help with OG crawler indexing
            const shareUrl = `${BASE_URL}/share/${encodeURIComponent(year)}/${encodeURIComponent(event)}`;
            xml += `  <url>\n`;
            xml += `    <loc>${shareUrl}</loc>\n`;
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
    console.log(`✨ Wrote ${sitemapPath}`);
}

generateSitemap();

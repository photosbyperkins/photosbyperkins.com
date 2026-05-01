import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Default Generic Placeholder Favicon 
// A widely recognized, permissive open-source camera icon outline.
const DEFAULT_FAVICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 192a96 96 0 1 1 0 192 96 96 0 1 1 0-192z" fill="white"/>
</svg>
`;

async function generateIcons() {
    try {
        let faviconSvg = DEFAULT_FAVICON_SVG;
        const customSvgPath = path.join(process.cwd(), 'icon.svg');
        
        if (fs.existsSync(customSvgPath)) {
            console.log('✨ Using custom user-provided icon.svg');
            faviconSvg = fs.readFileSync(customSvgPath, 'utf8');
        } else {
            console.log('ℹ️ No custom icon.svg found. Using default camera icon. Drop an icon.svg in the root to customize!');
        }

        fs.writeFileSync('public/favicon.svg', faviconSvg);
        const faviconBuffer = Buffer.from(faviconSvg);

        // 1. Standard 32x32 favicon.png
        await sharp(faviconBuffer).resize(32, 32).png().toFile('public/favicon.png');

        // 2. 180x180 apple-touch-icon.png (opaque with black background for iOS)
        await sharp({
            create: {
                width: 180,
                height: 180,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 1 },
            },
        })
            .composite([
                {
                    input: await sharp(faviconBuffer).resize(160, 160).toBuffer(),
                    gravity: 'center',
                },
            ])
            .png()
            .toFile('public/apple-touch-icon.png');

        console.log('✅ Successfully generated favicon.png, apple-touch-icon.png, and favicon.svg');
    } catch (err) {
        console.error('Error generating icons:', err);
        process.exit(1);
    }
}

generateIcons();

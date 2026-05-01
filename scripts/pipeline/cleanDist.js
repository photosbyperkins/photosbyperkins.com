import fs from 'fs';
import path from 'path';

const distDir = path.join(process.cwd(), 'dist');

if (!fs.existsSync(distDir)) {
    console.log('Dist directory does not exist. Skipping clean.');
    process.exit(0);
}

// Keep the data and photos folders, clear everything else out
const keepFolders = ['data', 'photos', 'thumbnails', 'zips', 'webp'];

console.log('Cleaning dist folder...');
const files = fs.readdirSync(distDir);

for (const file of files) {
    if (keepFolders.includes(file)) {
        continue;
    }
    const fullPath = path.join(distDir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
        fs.unlinkSync(fullPath);
    }
}

console.log('Clean complete.');

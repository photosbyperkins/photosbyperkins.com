import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION ---
import 'dotenv/config';

const SSH_USER = process.env.DEPLOY_SSH_USER;
const SSH_HOST = process.env.DEPLOY_SSH_HOST;
const REMOTE_DIR = process.env.DEPLOY_REMOTE_DIR;

if (!SSH_USER || !SSH_HOST || !REMOTE_DIR) {
    console.error('❌ Missing deploy configuration. Please check your .env file.');
    process.exit(1);
}
// ---------------------

const distDir = path.resolve(__dirname, '../dist');
const stagingDir = path.resolve(__dirname, '../deploy_staging');

console.log('🚀 Starting deployment to Bluehost...');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function copyFilesToStaging(src, dest, remoteMap) {
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        fs.readdirSync(src).forEach((child) => {
            copyFilesToStaging(path.join(src, child), path.join(dest, child), remoteMap);
        });
    } else {
        const relPath = path.relative(distDir, src).replace(/\\/g, '/');
        const localSize = stats.size;
        const remoteSize = remoteMap.get(relPath);

        const alwaysOverwrite = ['index.html', 'sitemap.xml', 'robots.txt'];

        // ALWAYS skip heavy media folders since they are managed via FileZilla
        if (
            relPath.startsWith('photos/') ||
            relPath.startsWith('thumbnails/') ||
            relPath.startsWith('webp/') ||
            relPath.startsWith('zips/') ||
            relPath.startsWith('scrubber/') ||
            relPath.startsWith('recap/')
        ) {
            return;
        }

        if (!alwaysOverwrite.includes(relPath) && !relPath.startsWith('data/')) {
            if (remoteSize !== undefined && remoteSize === localSize) {
                return; // Skip identical assets
            }
        }

        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

async function runDeploy() {
    try {
        // Retrieve existing files map to skip them
        console.log('🔍 Checking for existing files on the server to skip...');
        let remoteFilesMap = new Map();
        try {
            const sshCmd = `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "cd ${REMOTE_DIR} && find . -type f -not -path './photos/*' -not -path './thumbnails/*' -not -path './webp/*' -not -path './zips/*' -not -path './scrubber/*' -not -path './recap/*' -printf '%P|%s\\n' 2>/dev/null"`;
            const output = execSync(sshCmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
            const files = output.split('\n').filter(Boolean);
            files.forEach((line) => {
                const [rel, size] = line.split('|');
                if (rel && size) {
                    remoteFilesMap.set(rel.trim(), parseInt(size.trim(), 10));
                }
            });
            console.log(`✨ Found ${remoteFilesMap.size} existing files on server.`);
        } catch {
            console.log('⚠️ Could not fetch existing files list. Assuming none exist.', error.message);
        }

        // Build local files set to calculate stale prune list
        const localFilesSet = new Set();
        function collectLocalFiles(dir) {
            if (!fs.existsSync(dir)) return;
            fs.readdirSync(dir).forEach((child) => {
                const fullPath = path.join(dir, child);
                if (fs.statSync(fullPath).isDirectory()) {
                    collectLocalFiles(fullPath);
                } else {
                    localFilesSet.add(path.relative(distDir, fullPath).replace(/\\/g, '/'));
                }
            });
        }
        collectLocalFiles(distDir);

        // Create staging directory logic
        console.log('📂 Preparing staging directory...');
        if (fs.existsSync(stagingDir)) {
            fs.rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
        }
        fs.mkdirSync(stagingDir, { recursive: true });

        // Copy everything to staging EXCEPT the files that securely bypass checks
        copyFilesToStaging(distDir, stagingDir, remoteFilesMap);

        const itemsToCopy = fs.readdirSync(stagingDir);
        if (itemsToCopy.length === 0) {
            console.log('✅ Nothing to deploy. All files skipped.');
            return;
        }

        // Sort items for zero-downtime deployment priority
        const getPriority = (name) => {
            if (['favicon.ico', 'favicon.svg', 'favicon.png', 'apple-touch-icon.png'].includes(name)) return 1;
            if (name === 'data') return 2;
            if (name === 'assets') return 3;
            if (name === 'index.html') return 5;
            return 4; // Catch-all for sitemap.xml, robots.txt, etc.
        };

        itemsToCopy.sort((a, b) => getPriority(a) - getPriority(b));

        // Map top level files into paths for SCP
        // We use double quotes to handle spaces in paths
        const scpArgs = itemsToCopy.map((item) => `"${path.join(stagingDir, item)}"`).join(' ');
        const scpCommand = `scp -r -p ${scpArgs} ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}`;

        // Use scp to securely copy the staging directory contents to the remote server
        console.log(`🌐 Transferring new and updated files to ${SSH_USER}@${SSH_HOST}...`);

        let scpAttempt = 1;
        let scpSuccess = false;
        while (!scpSuccess) {
            try {
                execSync(scpCommand, { stdio: 'inherit' });
                scpSuccess = true;
            } catch {
                console.log(`⚠️ Transfer failed. Retrying in 5 seconds... (Attempt ${scpAttempt})`);
                await sleep(5000);
                scpAttempt++;
            }
        }

        // Fix file permissions on the remote server (755 for directories, 644 for files)
        console.log(`🔐 Setting correct file permissions on Bluehost...`);
        const chmodCommand = `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "find ${REMOTE_DIR} -path ${REMOTE_DIR}/photos -prune -o -path ${REMOTE_DIR}/webp -prune -o -path ${REMOTE_DIR}/thumbnails -prune -o -path ${REMOTE_DIR}/scrubber -prune -o -path ${REMOTE_DIR}/recap -prune -o -type d -exec chmod 755 {} + && find ${REMOTE_DIR} -path ${REMOTE_DIR}/photos -prune -o -path ${REMOTE_DIR}/webp -prune -o -path ${REMOTE_DIR}/thumbnails -prune -o -path ${REMOTE_DIR}/scrubber -prune -o -path ${REMOTE_DIR}/recap -prune -o -type f -exec chmod 644 {} +"`;

        let chmodAttempt = 1;
        let chmodSuccess = false;
        while (!chmodSuccess) {
            try {
                execSync(chmodCommand, { stdio: 'inherit' });
                chmodSuccess = true;
            } catch {
                console.log(`⚠️ Permission fix failed. Retrying in 5 seconds... (Attempt ${chmodAttempt})`);
                await sleep(5000);
                chmodAttempt++;
            }
        }

        const dirsToPrune = ['data', 'assets', 'hero', 'share'];
        const staleFiles = [];
        for (const [remotePath] of remoteFilesMap) {
            if (!localFilesSet.has(remotePath)) {
                if (remotePath.includes('/')) {
                    const topDir = remotePath.split('/')[0];
                    if (dirsToPrune.includes(topDir)) {
                        staleFiles.push(remotePath);
                    }
                } else {
                    if (remotePath.startsWith('workbox-')) {
                        staleFiles.push(remotePath);
                    }
                }
            }
        }

        if (staleFiles.length > 0) {
            console.log(`\n🧹 Pruning ${staleFiles.length} stale remote files...`);
            for (let i = 0; i < staleFiles.length; i += 50) {
                const batch = staleFiles
                    .slice(i, i + 50)
                    .map((f) => `"${REMOTE_DIR}/${f}"`)
                    .join(' ');
                try {
                    execSync(`ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "rm -f ${batch}"`, {
                        stdio: 'inherit',
                    });
                } catch {
                    console.log('⚠️ Could not delete a batch of stale files.', e.message);
                }
            }
        }

        console.log('🧹 Cleaning up staging directory...');
        if (fs.existsSync(stagingDir)) {
            try {
                fs.rmSync(stagingDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
            } catch {
                console.log('Could not clean up staging directory:', e.message);
            }
        }

        console.log('✅ Deployment complete!');
    } catch {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

runDeploy();

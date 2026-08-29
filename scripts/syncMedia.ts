import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SSH_USER = process.env.DEPLOY_SSH_USER;
const SSH_HOST = process.env.DEPLOY_SSH_HOST;
const REMOTE_DIR = process.env.DEPLOY_REMOTE_DIR;

if (!SSH_USER || !SSH_HOST || !REMOTE_DIR) {
    console.error('❌ Missing deploy configuration (DEPLOY_SSH_USER, DEPLOY_SSH_HOST, DEPLOY_REMOTE_DIR in .env).');
    process.exit(1);
}

const MEDIA_DIRS = ['thumbnails', 'webp', 'scrubber', 'recap', 'zips'];
const projectRoot = path.resolve(__dirname, '..');
const buildDir = path.join(projectRoot, 'build');

console.log('🚀 Starting Delta Media Sync...');

async function runMediaSync() {
    try {
        console.log('🔍 Querying existing remote media files...');
        const remoteFilesMap = new Map<string, number>();

        try {
            const sshCmd = `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "cd ${REMOTE_DIR} && find thumbnails webp scrubber recap zips -type f -printf '%P|%s\\n' 2>/dev/null"`;
            const output = execSync(sshCmd, { encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
            const lines = output.split('\n').filter(Boolean);
            lines.forEach((line) => {
                const [rel, size] = line.split('|');
                if (rel && size) {
                    remoteFilesMap.set(rel.trim(), parseInt(size.trim(), 10));
                }
            });
            console.log(`✨ Found ${remoteFilesMap.size} remote media files.`);
        } catch {
            console.log('⚠️ Could not query remote files list. Will attempt delta transfer.');
        }

        const pendingUploads: string[] = [];

        for (const dirName of MEDIA_DIRS) {
            const localDirPath = path.join(buildDir, dirName);
            if (!fs.existsSync(localDirPath)) continue;

            function scanLocal(current: string) {
                const entries = fs.readdirSync(current, { withFileTypes: true });
                for (const entry of entries) {
                    const full = path.join(current, entry.name);
                    if (entry.isDirectory()) {
                        scanLocal(full);
                    } else if (entry.isFile()) {
                        const rel = path.relative(buildDir, full).replace(/\\/g, '/');
                        const stat = fs.statSync(full);
                        const remoteSize = remoteFilesMap.get(rel);

                        if (remoteSize === undefined || remoteSize !== stat.size) {
                            pendingUploads.push(rel);
                        }
                    }
                }
            }

            scanLocal(localDirPath);
        }

        if (pendingUploads.length === 0) {
            console.log('✅ All media assets are up-to-date on the remote server!');
            return;
        }

        console.log(`📦 Found ${pendingUploads.length} new/modified media files to upload.`);

        // Upload in batches of 50 files
        const batchSize = 50;
        for (let i = 0; i < pendingUploads.length; i += batchSize) {
            const batch = pendingUploads.slice(i, i + batchSize);
            console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingUploads.length / batchSize)} (${batch.length} files)...`);

            for (const rel of batch) {
                const localFile = path.join(buildDir, rel);
                const remoteFileDir = path.posix.join(REMOTE_DIR, path.posix.dirname(rel));
                
                execSync(
                    `ssh -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST} "mkdir -p '${remoteFileDir}'"`,
                    { stdio: 'ignore' }
                );
                execSync(
                    `scp -p "${localFile}" ${SSH_USER}@${SSH_HOST}:"${remoteFileDir}/"`,
                    { stdio: 'inherit' }
                );
            }
        }

        console.log('✅ Media delta synchronization complete!');
    } catch (err: unknown) {
        console.error('❌ Media sync failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

runMediaSync();

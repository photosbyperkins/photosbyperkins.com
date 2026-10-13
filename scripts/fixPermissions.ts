import { execFileSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

// --- CONFIGURATION ---
const SSH_USER = process.env.DEPLOY_SSH_USER;
const SSH_HOST = process.env.DEPLOY_SSH_HOST;
const REMOTE_DIR = process.env.DEPLOY_REMOTE_DIR;

if (!SSH_USER || !SSH_HOST || !REMOTE_DIR) {
    console.error('❌ Missing deploy configuration. Please check your .env file.');
    process.exit(1);
}
// ---------------------

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

console.log(`🔐 Setting correct file permissions on Bluehost via SSH...`);

try {
    const quotedRemoteDir = shellQuote(REMOTE_DIR);
    const remoteCmd = `find ${quotedRemoteDir} -type d -exec chmod 755 {} + && find ${quotedRemoteDir} -type f -exec chmod 644 {} +`;

    console.log('⏳ Running chmod commands (this may take a minute)...');
    execFileSync('ssh', ['-o', 'StrictHostKeyChecking=accept-new', `${SSH_USER}@${SSH_HOST}`, remoteCmd], {
        stdio: 'inherit',
    });

    console.log('✅ Permissions fixed successfully!');
} catch (error: unknown) {
    console.error('❌ Failed to fix permissions:', error instanceof Error ? error.message : String(error));
    process.exit(1);
}

export const logger = {
    info: (msg: string) => console.log(`ℹ️  ${msg}`),
    success: (msg: string) => console.log(`✅ ${msg}`),
    error: (msg: string, err?: any) => {
        console.error(`❌ ${msg}`);
        if (err) console.error(err);
    },
    warn: (msg: string) => console.warn(`⚠️  ${msg}`),
    step: (msg: string) => console.log(`\n▶️ ${msg}`),
    substep: (msg: string) => console.log(`  └ ${msg}`),
    header: (msg: string) => console.log(`\n🚀 ${msg}\n${'='.repeat(40)}`),
    done: (msg: string) => console.log(`\n✨ ${'='.repeat(37)}\n🎉 ${msg}\n`)
};

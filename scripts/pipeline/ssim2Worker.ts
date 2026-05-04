import { getScore } from '@nrs-binding/ssimulacra2';

interface SsimMessage {
    img1: string;
    img2: string;
}

process.on('message', async (msg: SsimMessage) => {
    try {
        const score = await getScore(msg.img1, msg.img2);
        if (process.send) {
            process.send({ score });
        }
    } catch (error) {
        if (process.send) {
            process.send({ error: error instanceof Error ? error.message : String(error) });
        }
    }
});

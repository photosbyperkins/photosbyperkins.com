import { getScore } from '@nrs-binding/ssimulacra2';

process.on('message', async (msg) => {
    try {
        const score = await getScore(msg.img1, msg.img2);
        process.send({ score });
    } catch (error) {
        process.send({ error: error.message });
    }
});

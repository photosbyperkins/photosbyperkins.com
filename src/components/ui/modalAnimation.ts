import { EASE_OUT_EXPO } from '../../utils/motion';

export const modalFadeUp = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number = 0) => ({
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, delay: 0.12 + i * 0.05, ease: EASE_OUT_EXPO },
    }),
};

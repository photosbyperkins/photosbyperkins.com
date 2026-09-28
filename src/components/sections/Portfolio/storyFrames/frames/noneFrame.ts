import type { StoryFrameDefinition } from '../types';
import { createSvgString } from './helper';

export const NONE_FRAME: StoryFrameDefinition = {
    id: 'none',
    label: 'None',
    vibe: 'Clean, borderless photo export',
    signaturePalette: ['transparent'],
    renderSvg: () => null,
    getSvgString: () => createSvgString(''),
};

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

vi.mock('./storyDraw', () => ({
    applyFastBlurAndAdjust: vi.fn(),
    applyStoryFilterToImageData: vi.fn(),
    drawImageWithStoryFilter: vi.fn(),
    loadStoryFrameImage: vi.fn(async () => ({ width: 1080, height: 1920 }) as unknown as HTMLImageElement),
}));

import type { StoryRenderConfig } from './storyConstants';

type AssetsModule = typeof import('./storyAssets');
type DrawModule = typeof import('./storyDraw');
// Loaded fresh in beforeAll: with `isolate: false`, other test files may already have imported the real
// storyDraw, so the vi.mock() factory above would otherwise not apply.
let prepareStoryAssets: AssetsModule['prepareStoryAssets'];
let getStoryTargetSize: AssetsModule['getStoryTargetSize'];
let getImageNaturalSize: AssetsModule['getImageNaturalSize'];
let drawImageWithStoryFilter: DrawModule['drawImageWithStoryFilter'];
let loadStoryFrameImage: DrawModule['loadStoryFrameImage'];

beforeAll(async () => {
    vi.resetModules();
    ({ prepareStoryAssets, getStoryTargetSize, getImageNaturalSize } = await import('./storyAssets'));
    ({ drawImageWithStoryFilter, loadStoryFrameImage } = await import('./storyDraw'));
});

const makeImg = (w = 2000, h = 3000) =>
    ({ naturalWidth: w, naturalHeight: h, width: w, height: h }) as unknown as HTMLImageElement;

const baseConfig = (overrides: Partial<StoryRenderConfig> = {}): StoryRenderConfig =>
    ({
        mode: 'solo',
        badges: { showScoreboard: false, showAttribution: false },
        ...overrides,
    }) as unknown as StoryRenderConfig;

const fakeCtx = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
    putImageData: vi.fn(),
};

describe('storyAssets', () => {
    let getContextSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.mocked(drawImageWithStoryFilter).mockClear();
        vi.mocked(loadStoryFrameImage).mockClear();
        getContextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue(fakeCtx as unknown as ReturnType<HTMLCanvasElement['getContext']>);
    });

    afterEach(() => {
        getContextSpy.mockRestore();
    });

    it('maps resolutions to target sizes', () => {
        expect(getStoryTargetSize('1440x2560')).toEqual({ targetW: 1440, targetH: 2560 });
        expect(getStoryTargetSize('2160x3840')).toEqual({ targetW: 2160, targetH: 3840 });
        expect(getStoryTargetSize(undefined)).toEqual({ targetW: 1080, targetH: 1920 });
    });

    it('reads natural size from images and plain size from canvases', () => {
        expect(getImageNaturalSize(makeImg(10, 20))).toEqual({ w: 10, h: 20 });
        const canvas = document.createElement('canvas');
        canvas.width = 30;
        canvas.height = 40;
        expect(getImageNaturalSize(canvas)).toEqual({ w: 30, h: 40 });
    });

    it('returns null when there is nothing drawable', async () => {
        await expect(prepareStoryAssets([], baseConfig())).resolves.toBeNull();
        await expect(prepareStoryAssets(makeImg(0, 0), baseConfig())).resolves.toBeNull();
    });

    it('allows an empty burst (panels draw placeholders)', async () => {
        const assets = await prepareStoryAssets([null, null], baseConfig({ mode: 'burst' }));
        expect(assets).not.toBeNull();
    });

    it('honours explicit target size overrides', async () => {
        const assets = await prepareStoryAssets(makeImg(), baseConfig({ resolution: '2160x3840' }), {
            targetW: 1080,
            targetH: 1920,
        });
        expect(assets).toMatchObject({ targetW: 1080, targetH: 1920 });
    });

    it('does not bake the filter unless requested', async () => {
        const img = makeImg();
        const assets = await prepareStoryAssets(img, baseConfig({ filterId: 'warm' } as Partial<StoryRenderConfig>));
        expect(assets?.filterBaked).toBe(false);
        expect(assets?.images[0]).toBe(img);
        expect(drawImageWithStoryFilter).not.toHaveBeenCalled();
    });

    it('does not bake when no filter is active', async () => {
        const assets = await prepareStoryAssets(
            makeImg(),
            baseConfig({ filterId: 'none' } as Partial<StoryRenderConfig>),
            {
                bakeFilter: true,
            }
        );
        expect(assets?.filterBaked).toBe(false);
        expect(drawImageWithStoryFilter).not.toHaveBeenCalled();
    });

    it('bakes the filter into capped canvases when requested', async () => {
        const img = makeImg(8000, 4000);
        const assets = await prepareStoryAssets(img, baseConfig({ filterId: 'warm' } as Partial<StoryRenderConfig>), {
            bakeFilter: true,
        });
        expect(assets?.filterBaked).toBe(true);
        expect(assets?.rawImages[0]).toBe(img);
        const baked = assets?.images[0] as HTMLCanvasElement;
        expect(baked).toBeInstanceOf(HTMLCanvasElement);
        expect(baked.width).toBe(4096);
        expect(baked.height).toBe(2048);
        expect(drawImageWithStoryFilter).toHaveBeenCalledTimes(1);
    });

    it('loads the decorative frame once, only when one is selected', async () => {
        await prepareStoryAssets(makeImg(), baseConfig());
        expect(loadStoryFrameImage).not.toHaveBeenCalled();

        const assets = await prepareStoryAssets(
            makeImg(),
            baseConfig({ frameId: 'instant-film' } as Partial<StoryRenderConfig>)
        );
        expect(loadStoryFrameImage).toHaveBeenCalledTimes(1);
        expect(assets?.frameImage).not.toBeNull();
    });

    it('builds the frosted background only for padded frosted layouts', async () => {
        const full = await prepareStoryAssets(makeImg(), baseConfig());
        expect(full?.frostedBackground).toBeNull();

        const padded = await prepareStoryAssets(
            makeImg(),
            baseConfig({ mode: 'padded', padded: { style: 'frosted' } } as unknown as Partial<StoryRenderConfig>)
        );
        expect(padded?.frostedBackground).toBeInstanceOf(HTMLCanvasElement);
    });
});

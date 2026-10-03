import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryLayoutTab } from './StoryLayoutTab';
import { isFrameValidForWizardStep } from '../../../../utils/story';
import type { BurstMetadata } from '../../../../types';

describe('isFrameValidForWizardStep pure helper', () => {
    const total = 6;

    it('validates Step 0 (TOP): must leave room for MID and BTM (indices 0..3 valid, 4 and 5 invalid)', () => {
        expect(isFrameValidForWizardStep(0, 0, [null, null, null], total)).toBe(true);
        expect(isFrameValidForWizardStep(1, 0, [null, null, null], total)).toBe(true);
        expect(isFrameValidForWizardStep(2, 0, [null, null, null], total)).toBe(true);
        expect(isFrameValidForWizardStep(3, 0, [null, null, null], total)).toBe(true);
        // Second-to-last (4) and last (5) are greyed out / invalid
        expect(isFrameValidForWizardStep(4, 0, [null, null, null], total)).toBe(false);
        expect(isFrameValidForWizardStep(5, 0, [null, null, null], total)).toBe(false);
    });

    it('validates Step 1 (MID): must be strictly after TOP and leave room for BTM', () => {
        // TOP is index 1 (Frame 2)
        const slots = [1, null, null];
        expect(isFrameValidForWizardStep(0, 1, slots, total)).toBe(false); // <= TOP
        expect(isFrameValidForWizardStep(1, 1, slots, total)).toBe(false); // == TOP
        expect(isFrameValidForWizardStep(2, 1, slots, total)).toBe(true); // valid MID
        expect(isFrameValidForWizardStep(3, 1, slots, total)).toBe(true); // valid MID
        expect(isFrameValidForWizardStep(4, 1, slots, total)).toBe(true); // valid MID
        expect(isFrameValidForWizardStep(5, 1, slots, total)).toBe(false); // last frame (no room for BTM)
    });

    it('validates Step 2 (BTM): must be strictly after MID', () => {
        // TOP is index 1, MID is index 3 (Frame 4)
        const slots = [1, 3, null];
        expect(isFrameValidForWizardStep(0, 2, slots, total)).toBe(false);
        expect(isFrameValidForWizardStep(1, 2, slots, total)).toBe(false);
        expect(isFrameValidForWizardStep(2, 2, slots, total)).toBe(false);
        expect(isFrameValidForWizardStep(3, 2, slots, total)).toBe(false); // == MID
        expect(isFrameValidForWizardStep(4, 2, slots, total)).toBe(true); // valid BTM
        expect(isFrameValidForWizardStep(5, 2, slots, total)).toBe(true); // valid BTM
    });

    it('returns false when prerequisites are missing', () => {
        expect(isFrameValidForWizardStep(2, 1, [null, null, null], total)).toBe(false); // MID without TOP
        expect(isFrameValidForWizardStep(4, 2, [1, null, null], total)).toBe(false); // BTM without MID
        expect(isFrameValidForWizardStep(-1, 0, [null, null, null], total)).toBe(false);
        expect(isFrameValidForWizardStep(6, 0, [null, null, null], total)).toBe(false);
    });

    it('validates triptych mode: any unassigned photo is valid regardless of order', () => {
        // In triptych mode with 5 photos:
        // Any photo (0..4) is valid for step 0 when all slots empty
        expect(isFrameValidForWizardStep(0, 0, [null, null, null], 5, true)).toBe(true);
        expect(isFrameValidForWizardStep(4, 0, [null, null, null], 5, true)).toBe(true);

        // Can choose photo 4 for TOP (step 0), then photo 1 for MID (step 1)
        expect(isFrameValidForWizardStep(1, 1, [4, null, null], 5, true)).toBe(true);
        // Photo 4 is already in TOP, so it cannot be selected for MID
        expect(isFrameValidForWizardStep(4, 1, [4, null, null], 5, true)).toBe(false);

        // Photo currently in active step is considered valid (to allow re-clicking/toggling)
        expect(isFrameValidForWizardStep(4, 0, [4, null, null], 5, true)).toBe(true);

        // Out of bounds indices or invalid steps are invalid
        expect(isFrameValidForWizardStep(-1, 0, [null, null, null], 5, true)).toBe(false);
        expect(isFrameValidForWizardStep(5, 0, [null, null, null], 5, true)).toBe(false);
        expect(isFrameValidForWizardStep(0, 3, [null, null, null], 5, true)).toBe(false);
    });
});

describe('StoryLayoutTab - Sequential Burst Frame Wizard', () => {
    afterEach(() => {
        cleanup();
    });

    const burstMeta: BurstMetadata = {
        id: 'burst-1',
        index: 0,
        total: 6,
        deltaSec: 0,
        frameSources: [
            '/photos/b1.jpg',
            '/photos/b2.jpg',
            '/photos/b3.jpg',
            '/photos/b4.jpg',
            '/photos/b5.jpg',
            '/photos/b6.jpg',
        ],
        frameThumbs: [
            '/photos/tb1.jpg',
            '/photos/tb2.jpg',
            '/photos/tb3.jpg',
            '/photos/tb4.jpg',
            '/photos/tb5.jpg',
            '/photos/tb6.jpg',
        ],
        frameDeltas: [0, 0.21, 0.42, 0.63, 0.84, 1.05],
    };

    const defaultProps = {
        activeMode: 'burst' as const,
        setActiveMode: vi.fn(),
        selectedPresetId: 'center',
        setSelectedPresetId: vi.fn(),
        presets: [],
        onSelectPreset: vi.fn(),
        activeCrop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
        onCropChange: vi.fn(),
        naturalDimensions: { width: 1920, height: 1080 },
        paddedConfig: {
            style: 'frosted' as const,
            position: 'center' as const,
            cardScale: 0.92,
            cardCornerRadius: 24,
            customColor: '#0a0a14',
        },
        setPaddedConfig: vi.fn(),
        setIsDownloaded: vi.fn(),
        burst: burstMeta,
    };

    it('renders label "Burst Frames", inline feedback, 3 wizard steps, and greys out invalid frames', () => {
        render(<StoryLayoutTab {...defaultProps} burstSelectedIndices={[null, null, null]} />);

        expect(screen.getByText('Burst Frames')).not.toBeNull();
        expect(screen.getByText('Pick 3 frames')).not.toBeNull();

        // 3 Segmented Wizard Step Buttons
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        expect(stepButtons).toHaveLength(3);
        expect(stepButtons[0].className).toContain('story-export-modal__pill--active');

        expect(stepButtons[0].textContent).toContain('1. TOP');
        expect(stepButtons[0].textContent).toContain('Empty');
        expect(stepButtons[1].textContent).toContain('2. MID');
        expect(stepButtons[1].textContent).toContain('Empty');
        expect(stepButtons[2].textContent).toContain('3. BTM');
        expect(stepButtons[2].textContent).toContain('Empty');

        // DIVIDER option should be removed from UI (always uses hairline)
        expect(screen.queryByText('DIVIDER')).toBeNull();
        expect(screen.queryByText('Hairline')).toBeNull();
        expect(screen.queryByText('Gutter')).toBeNull();
        expect(screen.queryByText('Filmstrip')).toBeNull();

        // +Δt timestamp toggle is preserved
        expect(screen.getByText('+Δt')).not.toBeNull();

        // Hint row (Step X of 3 / Tap active to clear) should be removed to save vertical space
        expect(screen.queryByText(/Step 1 of 3/i)).toBeNull();
        expect(screen.queryByText(/Tap active to clear/i)).toBeNull();

        // Check thumbnail strip: Frames 5 & 6 (indices 4 & 5) must be disabled for Step 1
        const thumbs = document.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        expect(thumbs).toHaveLength(6);
        expect(thumbs[0].disabled).toBe(false);
        expect(thumbs[1].disabled).toBe(false);
        expect(thumbs[2].disabled).toBe(false);
        expect(thumbs[3].disabled).toBe(false);
        expect(thumbs[4].disabled).toBe(true);
        expect(thumbs[4].className).toContain('story-export-modal__burst-thumb--disabled');
        expect(thumbs[5].disabled).toBe(true);
        expect(thumbs[5].className).toContain('story-export-modal__burst-thumb--disabled');
    });

    it('renders inline feedback "Pick 1 frame" when 2 frames are selected', () => {
        render(<StoryLayoutTab {...defaultProps} burstSelectedIndices={[0, null, 2]} />);

        expect(screen.getByText('Burst Frames')).not.toBeNull();
        expect(screen.getByText('Pick 1 frame')).not.toBeNull();
        expect(screen.getByText('Empty')).not.toBeNull();
    });

    it('renders inline feedback "Pick 2 frames" when 1 frame is selected', () => {
        render(<StoryLayoutTab {...defaultProps} burstSelectedIndices={[0, null, null]} />);

        expect(screen.getByText('Burst Frames')).not.toBeNull();
        expect(screen.getByText('Pick 2 frames')).not.toBeNull();
    });

    it('renders feedback "3 frames selected" and sequence summary when complete', () => {
        render(<StoryLayoutTab {...defaultProps} burstSelectedIndices={[0, 2, 4]} />);

        expect(screen.getByText('Burst Frames')).not.toBeNull();
        expect(screen.getByText('3 frames selected')).not.toBeNull();
    });

    it('assigns valid frame to TOP and auto-advances to MID step', () => {
        const setBurstSelectedIndices = vi.fn();
        const setIsDownloaded = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[null, null, null]}
                setBurstSelectedIndices={setBurstSelectedIndices}
                setIsDownloaded={setIsDownloaded}
            />
        );

        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        // Click Frame 2 (index 1) for TOP
        fireEvent.click(thumbs[1]);

        expect(setBurstSelectedIndices).toHaveBeenCalledWith([1, null, null]);
        expect(setIsDownloaded).toHaveBeenCalledWith(false);

        // Active pill should auto-advance to MID (step 1)
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        expect(stepButtons[1].className).toContain('story-export-modal__pill--active');
    });

    it('greys out frames <= TOP and the very last frame when on MID step', () => {
        const { container } = render(<StoryLayoutTab {...defaultProps} burstSelectedIndices={[1, null, null]} />);

        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        // Frame 1 (index 0) <= TOP -> disabled
        expect(thumbs[0].disabled).toBe(true);
        expect(thumbs[0].className).toContain('story-export-modal__burst-thumb--disabled');

        // Frame 2 (index 1) is TOP -> selected badge
        expect(thumbs[1].className).toContain('story-export-modal__burst-thumb--selected');

        // Frames 3, 4, 5 (indices 2, 3, 4) -> valid MIDs (enabled)
        expect(thumbs[2].disabled).toBe(false);
        expect(thumbs[3].disabled).toBe(false);
        expect(thumbs[4].disabled).toBe(false);

        // Frame 6 (index 5) is last frame -> disabled (must leave room for BTM)
        expect(thumbs[5].disabled).toBe(true);
        expect(thumbs[5].className).toContain('story-export-modal__burst-thumb--disabled');
    });

    it('assigns valid frame to MID and auto-advances to BTM step', () => {
        const setBurstSelectedIndices = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[1, null, null]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        // Click Frame 4 (index 3) for MID
        fireEvent.click(thumbs[3]);

        expect(setBurstSelectedIndices).toHaveBeenCalledWith([1, 3, null]);

        // Active pill should advance to BTM (step 2)
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        expect(stepButtons[2].className).toContain('story-export-modal__pill--active');
    });

    it('invalidates downstream slots when editing an earlier step to a later frame', () => {
        const setBurstSelectedIndices = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[0, 2, 4]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Click TOP step pill to switch activeStep back to TOP
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        fireEvent.click(stepButtons[0]);

        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        // Select Frame 4 (index 3) as new TOP -> old MID (2) is <= 3, so MID and BTM must be cleared
        fireEvent.click(thumbs[3]);

        expect(setBurstSelectedIndices).toHaveBeenCalledWith([3, null, null]);
    });

    it('deselects a frame and downstream slots when clicking the frame currently assigned to active step', () => {
        const setBurstSelectedIndices = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[0, 2, 4]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Click TOP step pill (activeStep = 0)
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        fireEvent.click(stepButtons[0]);

        // Click Frame 1 (index 0) which is currently TOP
        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        fireEvent.click(thumbs[0]);

        // TOP is cleared and downstream MID & BTM are cleared
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([null, null, null]);
    });

    it('clears active slot and downstream slots when clicking the active step pill again', () => {
        const setBurstSelectedIndices = vi.fn();
        render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[0, 2, 4]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // activeStep starts at 0 (TOP)
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        // Click active TOP step button again
        fireEvent.click(stepButtons[0]);

        expect(setBurstSelectedIndices).toHaveBeenCalledWith([null, null, null]);
    });

    it('switches active step to corresponding slot when clicking an already assigned thumbnail', () => {
        const { container } = render(<StoryLayoutTab {...defaultProps} burstSelectedIndices={[0, 2, 4]} />);

        // Starts on TOP (step 0). Click Frame 3 (index 2) which is MID
        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        fireEvent.click(thumbs[2]);

        // Active step switches to MID (step 1)
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        expect(stepButtons[1].className).toContain('story-export-modal__pill--active');
    });
});

describe('StoryLayoutTab - Triptych Multi-Photo Selection Wizard', () => {
    afterEach(() => {
        cleanup();
    });

    const triptychMeta: BurstMetadata = {
        id: 'triptych-batch-1',
        index: 0,
        total: 5,
        isTriptych: true,
        frameSources: ['/photos/p1.jpg', '/photos/p2.jpg', '/photos/p3.jpg', '/photos/p4.jpg', '/photos/p5.jpg'],
        frameThumbs: ['/photos/tp1.jpg', '/photos/tp2.jpg', '/photos/tp3.jpg', '/photos/tp4.jpg', '/photos/tp5.jpg'],
    };

    const defaultTriptychProps = {
        activeMode: 'burst' as const,
        setActiveMode: vi.fn(),
        selectedPresetId: 'center',
        setSelectedPresetId: vi.fn(),
        presets: [],
        onSelectPreset: vi.fn(),
        activeCrop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
        onCropChange: vi.fn(),
        naturalDimensions: { width: 1920, height: 1080 },
        paddedConfig: {
            style: 'frosted' as const,
            position: 'center' as const,
            cardScale: 0.92,
            cardCornerRadius: 24,
            customColor: '#0a0a14',
        },
        setPaddedConfig: vi.fn(),
        setIsDownloaded: vi.fn(),
        burst: triptychMeta,
    };

    it('renders "Triptych Photos", "Pick 3 photos", P1/P2/P3 slot labels, and omits +Δt toggle', () => {
        render(<StoryLayoutTab {...defaultTriptychProps} burstSelectedIndices={[null, null, null]} />);

        expect(screen.getByText('Triptych Photos')).not.toBeNull();
        expect(screen.getByText('Pick 3 photos')).not.toBeNull();
        expect(screen.queryByText('+Δt')).toBeNull();

        const slotGroup = screen.getByRole('group', { name: /Triptych Photo Slots/i });
        const stepButtons = slotGroup.querySelectorAll('button');
        expect(stepButtons).toHaveLength(3);
        expect(stepButtons[0].textContent).toContain('1. TOP');
        expect(stepButtons[0].textContent).toContain('Empty');

        // Check thumbnail strip: 5 thumbnails, labeled P1..P5 without timestamp badges
        const thumbs = document.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        expect(thumbs).toHaveLength(5);
        expect(document.querySelector('.story-export-modal__burst-thumb-badge')).toBeNull();
        expect(thumbs[0].textContent).toContain('P1');
        expect(thumbs[4].textContent).toContain('P5');

        // In triptych mode, all 5 photos are initially enabled (no chronological ordering)
        thumbs.forEach((thumb) => {
            expect(thumb.disabled).toBe(false);
        });
    });

    it('renders "Pick 1 photo" and "3 photos selected" correctly based on selection', () => {
        const { rerender } = render(<StoryLayoutTab {...defaultTriptychProps} burstSelectedIndices={[0, null, 2]} />);
        expect(screen.getByText('Pick 1 photo')).not.toBeNull();

        rerender(<StoryLayoutTab {...defaultTriptychProps} burstSelectedIndices={[0, 1, 2]} />);
        expect(screen.getByText('3 photos selected')).not.toBeNull();
    });

    it('allows assigning any photo to any slot without chronological constraints', () => {
        const setBurstSelectedIndices = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...defaultTriptychProps}
                burstSelectedIndices={[null, null, null]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        // Click Photo 5 (index 4) for TOP
        fireEvent.click(thumbs[4]);

        expect(setBurstSelectedIndices).toHaveBeenCalledWith([4, null, null]);

        // Auto-advances to MID (step 1)
        const slotGroup = screen.getByRole('group', { name: /Triptych Photo Slots/i });
        const stepButtons = slotGroup.querySelectorAll('button');
        expect(stepButtons[1].className).toContain('story-export-modal__pill--active');
    });

    it('clears ONLY the active slot without downstream invalidation in triptych mode', () => {
        const setBurstSelectedIndices = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...defaultTriptychProps}
                burstSelectedIndices={[4, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // activeStep starts at 0 (TOP). Deselect Photo 5 (index 4) which is TOP
        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        fireEvent.click(thumbs[4]);

        // Only slot 0 is cleared; slots 1 and 2 remain intact
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([null, 1, 2]);
    });

    it('clears ONLY active slot when tapping active slot button in triptych mode', () => {
        const setBurstSelectedIndices = vi.fn();
        render(
            <StoryLayoutTab
                {...defaultTriptychProps}
                burstSelectedIndices={[4, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        const slotGroup = screen.getByRole('group', { name: /Triptych Photo Slots/i });
        const stepButtons = slotGroup.querySelectorAll('button');
        // Tap active TOP slot pill
        fireEvent.click(stepButtons[0]);

        // Only slot 0 is cleared; slots 1 and 2 are preserved
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([null, 1, 2]);
    });
});

describe('StoryLayoutTab - Single Photo Selector and Crop Zoom Removal', () => {
    afterEach(() => {
        cleanup();
    });

    const multiPhotoMeta: BurstMetadata = {
        id: 'batch-multi-1',
        index: 0,
        total: 4,
        isTriptych: true,
        frameSources: ['/p1.jpg', '/p2.jpg', '/p3.jpg', '/p4.jpg'],
        frameThumbs: ['/tp1.jpg', '/tp2.jpg', '/tp3.jpg', '/tp4.jpg'],
    };

    const baseProps = {
        activeMode: 'crop' as const,
        setActiveMode: vi.fn(),
        selectedPresetId: 'center',
        setSelectedPresetId: vi.fn(),
        presets: [
            {
                id: 'center',
                label: 'Center',
                mode: 'crop' as const,
                crop: { x: 0, y: 0, width: 1, height: 1, zoom: 1, centerX: 0.5, centerY: 0.5 },
                description: 'Centered',
            },
        ],
        onSelectPreset: vi.fn(),
        naturalDimensions: { width: 1920, height: 1080 },
        paddedConfig: {
            style: 'frosted' as const,
            position: 'center' as const,
            cardScale: 0.92,
            cardCornerRadius: 24,
            customColor: '#0a0a14',
        },
        setPaddedConfig: vi.fn(),
        setIsDownloaded: vi.fn(),
        burst: multiPhotoMeta,
        activePhotoIndex: 0,
        onSelectPhotoIndex: vi.fn(),
    };

    it('does NOT render Crop Zoom section in crop mode', () => {
        render(<StoryLayoutTab {...baseProps} />);
        expect(screen.queryByText(/Crop Zoom/i)).toBeNull();
        expect(screen.queryByLabelText(/Crop Zoom Level/i)).toBeNull();
        expect(screen.queryByRole('group', { name: /Zoom snap points/i })).toBeNull();
    });

    it('renders single photo selector in crop mode when multiple photos are available', () => {
        const onSelectPhotoIndex = vi.fn();
        render(<StoryLayoutTab {...baseProps} onSelectPhotoIndex={onSelectPhotoIndex} />);

        expect(screen.getByText('Selected Photo')).not.toBeNull();
        expect(screen.getByText('Photo 1 of 4')).not.toBeNull();

        const selector = screen.getByRole('group', { name: /Photo Selector/i });
        const thumbs = selector.querySelectorAll<HTMLButtonElement>('button');
        expect(thumbs).toHaveLength(4);

        // Click Photo 3 (index 2)
        fireEvent.click(thumbs[2]);
        expect(onSelectPhotoIndex).toHaveBeenCalledWith(2);
    });

    it('renders single photo selector in padded mode when multiple photos are available', () => {
        const onSelectPhotoIndex = vi.fn();
        render(<StoryLayoutTab {...baseProps} activeMode="padded" onSelectPhotoIndex={onSelectPhotoIndex} />);

        expect(screen.getByText('Selected Photo')).not.toBeNull();
        expect(screen.getByText('Photo 1 of 4')).not.toBeNull();

        const selector = screen.getByRole('group', { name: /Photo Selector/i });
        const thumbs = selector.querySelectorAll<HTMLButtonElement>('button');
        expect(thumbs).toHaveLength(4);

        fireEvent.click(thumbs[1]);
        expect(onSelectPhotoIndex).toHaveBeenCalledWith(1);
    });

    it('hides multi-panel mode button in mode toggle when burst.total < 2', () => {
        const singlePhotoMeta: BurstMetadata = {
            id: 'single-1',
            index: 0,
            total: 1,
            frameSources: ['/p1.jpg'],
            frameThumbs: ['/tp1.jpg'],
        };

        render(<StoryLayoutTab {...baseProps} burst={singlePhotoMeta} />);

        expect(screen.queryByRole('button', { name: /duet/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /triptych/i })).toBeNull();
        expect(screen.queryByRole('button', { name: /burst/i })).toBeNull();
        expect(screen.getByRole('button', { name: /center/i })).not.toBeNull();
    });

    it('renders Duet button in mode toggle when burst.total === 2', () => {
        const twoPhotoMeta: BurstMetadata = {
            id: 'batch-2',
            index: 0,
            total: 2,
            isTriptych: true,
            isDuet: true,
            frameSources: ['/p1.jpg', '/p2.jpg'],
            frameThumbs: ['/tp1.jpg', '/tp2.jpg'],
        };

        render(<StoryLayoutTab {...baseProps} burst={twoPhotoMeta} />);

        expect(screen.getByRole('button', { name: /duet/i })).not.toBeNull();
        expect(screen.getByRole('button', { name: /solo/i })).not.toBeNull();
    });

    it('renders 2 wizard slots (TOP, BTM) and Duet photo controls when panelCount is 2 with >2 photos', () => {
        const multiDuetMeta: BurstMetadata = {
            id: 'batch-duet-multi',
            index: 0,
            total: 4,
            isTriptych: true,
            isDuet: true,
            frameSources: ['/p1.jpg', '/p2.jpg', '/p3.jpg', '/p4.jpg'],
            frameThumbs: ['/tp1.jpg', '/tp2.jpg', '/tp3.jpg', '/tp4.jpg'],
        };

        render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={multiDuetMeta}
                panelCount={2}
                burstSelectedIndices={[null, null]}
            />
        );

        expect(screen.getByText('Duet Photos')).not.toBeNull();
        expect(screen.getByText('Pick 2 photos')).not.toBeNull();

        const slotGroup = screen.getByRole('group', { name: /Duet Photo Slots/i });
        const stepButtons = slotGroup.querySelectorAll('.story-export-modal__burst-slot-pill');
        expect(stepButtons).toHaveLength(2);
        expect(stepButtons[0].textContent).toContain('1. TOP');
        expect(stepButtons[1].textContent).toContain('2. BTM');

        const swapBtn = screen.getByRole('button', { name: /Swap Top and Bottom photos/i }) as HTMLButtonElement;
        expect(swapBtn).not.toBeNull();
        expect(swapBtn.disabled).toBe(true);
    });

    it('renders both Duet and Triptych mode toggle buttons for camera bursts with >= 3 frames', () => {
        const cameraBurstMeta: BurstMetadata = {
            id: 'cam-burst-3',
            index: 0,
            total: 6,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg', '/f5.jpg', '/f6.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg', '/tf5.jpg', '/tf6.jpg'],
            frameDeltas: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
        };

        render(<StoryLayoutTab {...baseProps} burst={cameraBurstMeta} />);

        expect(screen.getByRole('button', { name: /solo/i })).not.toBeNull();
        expect(screen.getByRole('button', { name: /^Duet$/i })).not.toBeNull();
        expect(screen.getByRole('button', { name: /^Triptych$/i })).not.toBeNull();
        expect(screen.queryByRole('button', { name: /^BURST$/i })).toBeNull();
    });

    it('allows arbitrary ordering and swapping in camera burst when timestamps (+Δt) are disabled', () => {
        const cameraBurstMeta: BurstMetadata = {
            id: 'cam-burst-swap',
            index: 0,
            total: 4,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg'],
            frameDeltas: [0, 0.2, 0.4, 0.6],
        };

        const setBurstSelectedIndices = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta}
                burstShowTimeStamps={false}
                burstPanelCount={2}
                burstSelectedIndices={[0, 3]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // When burstShowTimeStamps is false, Swap button should be visible in Duet mode
        const swapBtn = screen.getByRole('button', { name: /Swap Top and Bottom photos/i });
        expect(swapBtn).not.toBeNull();

        fireEvent.click(swapBtn);
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([3, 0]);

        // Also test that thumbs can be selected in reverse order
        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        // None of the non-selected thumbnails should be disabled when timestamps are hidden
        thumbs.forEach((thumb) => {
            expect(thumb.disabled).toBe(false);
        });
    });

    it('disables swap and hides icon but preserves button in DOM when timestamps (+Δt) are enabled', () => {
        const cameraBurstMeta: BurstMetadata = {
            id: 'cam-burst-swap-disabled',
            index: 0,
            total: 4,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg'],
            frameDeltas: [0, 0.2, 0.4, 0.6],
        };

        const setBurstSelectedIndices = vi.fn();
        render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta}
                burstShowTimeStamps={true}
                burstPanelCount={2}
                burstSelectedIndices={[0, 3]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        const swapBtn = screen.getByRole('button', { name: /Swap Top and Bottom photos/i }) as HTMLButtonElement;
        expect(swapBtn).not.toBeNull();
        expect(swapBtn.disabled).toBe(true);
        expect(swapBtn.classList.contains('story-export-modal__swap-pill--disabled')).toBe(true);

        fireEvent.click(swapBtn);
        expect(setBurstSelectedIndices).not.toHaveBeenCalled();
    });

    it('automatically sorts existing chosen frames chronologically when toggling +Δt to Show', () => {
        const cameraBurstMeta: BurstMetadata = {
            id: 'cam-burst-auto-sort',
            index: 0,
            total: 5,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg', '/f5.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg', '/tf5.jpg'],
            frameDeltas: [0, 0.2, 0.4, 0.6, 0.8],
        };

        const setBurstSelectedIndices = vi.fn();
        const setBurstShowTimeStamps = vi.fn();

        render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta}
                burstShowTimeStamps={false}
                setBurstShowTimeStamps={setBurstShowTimeStamps}
                burstPanelCount={2}
                burstSelectedIndices={[3, 0]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Click the Show button for +Δt
        const showBtn = screen.getByRole('button', { name: /^Show$/i });
        fireEvent.click(showBtn);

        expect(setBurstShowTimeStamps).toHaveBeenCalledWith(true);
        // Automatically sorts [3, 0] -> [0, 3] so top frame is chronologically first
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([0, 3]);
    });

    it('automatically sorts 3-panel frames chronologically when toggling +Δt to Show', () => {
        const cameraBurstMeta: BurstMetadata = {
            id: 'cam-burst-auto-sort-3',
            index: 0,
            total: 6,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg', '/f5.jpg', '/f6.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg', '/tf5.jpg', '/tf6.jpg'],
            frameDeltas: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
        };

        const setBurstSelectedIndices = vi.fn();
        const setBurstShowTimeStamps = vi.fn();

        render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta}
                burstShowTimeStamps={false}
                setBurstShowTimeStamps={setBurstShowTimeStamps}
                burstPanelCount={3}
                burstSelectedIndices={[4, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        const showBtn = screen.getByRole('button', { name: /^Show$/i });
        fireEvent.click(showBtn);

        expect(setBurstShowTimeStamps).toHaveBeenCalledWith(true);
        // Automatically sorts [4, 1, 2] -> [1, 2, 4]
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([1, 2, 4]);
    });

    it('suppresses frame selector and selects [0, 1] in Duet when only 2 frames are available and +Δt is shown', () => {
        const cameraBurstMeta2: BurstMetadata = {
            id: 'cam-burst-2',
            index: 0,
            total: 2,
            frameSources: ['/f1.jpg', '/f2.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg'],
            frameDeltas: [0, 0.5],
        };

        const setBurstSelectedIndices = vi.fn();
        const setBurstShowTimeStamps = vi.fn();

        const { container, rerender } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta2}
                burstShowTimeStamps={true}
                setBurstShowTimeStamps={setBurstShowTimeStamps}
                burstPanelCount={2}
                burstSelectedIndices={[0, 1]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Frame selector (slots and thumbnail strip) should be suppressed
        expect(container.querySelector('.story-export-modal__burst-selector')).toBeNull();
        // But +Δt toggle is still visible
        expect(screen.getByRole('button', { name: /^Show$/i })).not.toBeNull();
        expect(screen.getByRole('button', { name: /^Hide$/i })).not.toBeNull();

        // Toggling to Hide reveals the frame selector
        const hideBtn = screen.getByRole('button', { name: /^Hide$/i });
        fireEvent.click(hideBtn);
        expect(setBurstShowTimeStamps).toHaveBeenCalledWith(false);

        // Rerender with burstShowTimeStamps = false
        rerender(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta2}
                burstShowTimeStamps={false}
                setBurstShowTimeStamps={setBurstShowTimeStamps}
                burstPanelCount={2}
                burstSelectedIndices={[0, 1]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Frame selector is now visible
        expect(container.querySelector('.story-export-modal__burst-selector')).not.toBeNull();
    });

    it('suppresses frame selector and selects [0, 1, 2] in Triptych when only 3 frames are available and +Δt is shown', () => {
        const cameraBurstMeta3: BurstMetadata = {
            id: 'cam-burst-3',
            index: 0,
            total: 3,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg'],
            frameDeltas: [0, 0.4, 0.8],
        };

        const setBurstSelectedIndices = vi.fn();
        const setBurstShowTimeStamps = vi.fn();

        const { container, rerender } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta3}
                burstShowTimeStamps={true}
                setBurstShowTimeStamps={setBurstShowTimeStamps}
                burstPanelCount={3}
                burstSelectedIndices={[0, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Frame selector should be suppressed
        expect(container.querySelector('.story-export-modal__burst-selector')).toBeNull();

        // When toggling +Δt to Hide, frame selector becomes visible
        rerender(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta3}
                burstShowTimeStamps={false}
                setBurstShowTimeStamps={setBurstShowTimeStamps}
                burstPanelCount={3}
                burstSelectedIndices={[0, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        expect(container.querySelector('.story-export-modal__burst-selector')).not.toBeNull();
    });

    it('does NOT suppress frame selector in Duet when >2 frames are available even with +Δt shown', () => {
        const cameraBurstMeta4: BurstMetadata = {
            id: 'cam-burst-4',
            index: 0,
            total: 4,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg'],
            frameDeltas: [0, 0.2, 0.4, 0.6],
        };

        const { container } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta4}
                burstShowTimeStamps={true}
                burstPanelCount={2}
                burstSelectedIndices={[0, 1]}
            />
        );

        // Frame selector must NOT be suppressed because user can pick which 2 of the 4 frames to use
        expect(container.querySelector('.story-export-modal__burst-selector')).not.toBeNull();
    });

    it('streamlines 2-frame Duet when +Δt is Hidden by suppressing the thumbnail strip while keeping the slot bar and swap button', () => {
        const cameraBurstMeta2: BurstMetadata = {
            id: 'cam-burst-2',
            index: 0,
            total: 2,
            frameSources: ['/f1.jpg', '/f2.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg'],
            frameDeltas: [0, 0.42],
        };

        const setBurstSelectedIndices = vi.fn();

        const { container } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta2}
                burstShowTimeStamps={false}
                burstPanelCount={2}
                burstSelectedIndices={[0, 1]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        // Burst selector (slot group with swap pill) is visible
        expect(container.querySelector('.story-export-modal__burst-slot-group')).not.toBeNull();
        expect(screen.getByRole('button', { name: /Swap Top and Bottom photos/i })).not.toBeNull();

        // But thumbnail strip is suppressed
        expect(container.querySelector('.story-export-modal__burst-strip')).toBeNull();

        // Clicking a slot pill does NOT clear it to null
        const topSlotPill = screen.getByRole('button', { name: /Step 1 \(TOP\)/i });
        fireEvent.click(topSlotPill);
        expect(setBurstSelectedIndices).not.toHaveBeenCalledWith([null, 1]);
    });

    it('displays active time delta (+Δt) badge in settings row when timestamps are enabled', () => {
        const cameraBurstMeta4: BurstMetadata = {
            id: 'cam-burst-4',
            index: 0,
            total: 4,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg'],
            frameDeltas: [0, 0.21, 0.42, 0.63],
        };

        const { container, rerender } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta4}
                burstShowTimeStamps={true}
                burstPanelCount={2}
                burstSelectedIndices={[0, 1]}
            />
        );

        const badge = container.querySelector('.story-export-modal__delta-badge');
        expect(badge).not.toBeNull();
        expect(badge?.textContent).toBe('(+0.21s)');

        // When timestamp is hidden, badge is not rendered
        rerender(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta4}
                burstShowTimeStamps={false}
                burstPanelCount={2}
                burstSelectedIndices={[0, 1]}
            />
        );
        expect(container.querySelector('.story-export-modal__delta-badge')).toBeNull();
    });

    it('renders Sequence Invert / Reverse button for Triptych when +Δt is Hidden and all 3 frames are assigned', () => {
        const cameraBurstMeta4: BurstMetadata = {
            id: 'cam-burst-4',
            index: 0,
            total: 4,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg', '/f4.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg', '/tf4.jpg'],
            frameDeltas: [0, 0.21, 0.42, 0.63],
        };

        const setBurstSelectedIndices = vi.fn();

        const { rerender } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta4}
                burstShowTimeStamps={false}
                burstPanelCount={3}
                burstSelectedIndices={[0, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );

        const reverseBtn = screen.getByRole('button', { name: /Reverse frame sequence/i });
        expect(reverseBtn).not.toBeNull();

        fireEvent.click(reverseBtn);
        expect(setBurstSelectedIndices).toHaveBeenCalledWith([2, 1, 0]);

        // When +Δt is shown (chronological ordering enforced), Reverse button is not rendered
        rerender(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={cameraBurstMeta4}
                burstShowTimeStamps={true}
                burstPanelCount={3}
                burstSelectedIndices={[0, 1, 2]}
                setBurstSelectedIndices={setBurstSelectedIndices}
            />
        );
        expect(screen.queryByRole('button', { name: /Reverse frame sequence/i })).toBeNull();
    });

    it('renders integrated framing header containing Framing label, inline zoom slider, and zoom value readout', () => {
        const onCropChange = vi.fn();
        const { container } = render(
            <StoryLayoutTab
                {...baseProps}
                onCropChange={onCropChange}
                activeCrop={{ x: 0.21875, y: 0, centerX: 0.5, centerY: 0.5, width: 0.5625, height: 1.0, zoom: 1.0 }}
            />
        );

        const framingHeader = container.querySelector('.story-export-modal__framing-header');
        expect(framingHeader).not.toBeNull();

        const sublabel = framingHeader?.querySelector('.story-export-modal__sublabel');
        expect(sublabel?.textContent).toBe('Framing');

        const zoomSlider = screen.getByRole('slider', { name: /Photo Zoom/i });
        expect(zoomSlider).not.toBeNull();
        expect(zoomSlider.classList.contains('story-export-modal__slider--inline')).toBe(true);

        const zoomValue = framingHeader?.querySelector('.story-export-modal__zoom-value');
        expect(zoomValue?.textContent).toBe('Fill');

        // Adjusting slider calls onCropChange
        fireEvent.change(zoomSlider, { target: { value: '1.5' } });
        expect(onCropChange).toHaveBeenCalled();
    });

    it('respects controlled burstActiveStep and calls setBurstActiveStep when picking slots', () => {
        const setBurstActiveStep = vi.fn();
        const twoPhotoMeta: BurstMetadata = {
            id: 'batch-duet-step',
            index: 0,
            total: 2,
            isTriptych: true,
            isDuet: true,
            frameSources: ['/p1.jpg', '/p2.jpg'],
            frameThumbs: ['/tp1.jpg', '/tp2.jpg'],
        };

        render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={twoPhotoMeta}
                panelCount={2}
                burstSelectedIndices={[0, null]}
                burstActiveStep={1}
                setBurstActiveStep={setBurstActiveStep}
            />
        );

        // Slot 2 (BTM) should be active since burstActiveStep is 1
        const slot2Btn = screen.getByRole('button', { name: /Step 2 \(BTM\): Empty/i });
        expect(slot2Btn.getAttribute('aria-pressed')).toBe('true');
        expect(slot2Btn.classList.contains('active')).toBe(true);

        // Clicking slot 1 (TOP) triggers setBurstActiveStep(0)
        const slot1Btn = screen.getByRole('button', { name: /Step 1 \(TOP\)/i });
        fireEvent.click(slot1Btn);
        expect(setBurstActiveStep).toHaveBeenCalledWith(0);
    });

    it('renders Solo mode toggle button with Title Case typography matching Duet and Triptych', () => {
        const burstMeta: BurstMetadata = {
            id: 'burst-mode-casing',
            index: 0,
            total: 3,
            frameSources: ['/f1.jpg', '/f2.jpg', '/f3.jpg'],
            frameThumbs: ['/tf1.jpg', '/tf2.jpg', '/tf3.jpg'],
        };

        render(<StoryLayoutTab {...baseProps} burst={burstMeta} />);

        const soloBtn = screen.getByRole('button', { name: /^Solo$/i });
        expect(soloBtn.textContent).toBe('Solo');

        const duetBtn = screen.getByRole('button', { name: /^Duet$/i });
        expect(duetBtn.textContent).toBe('Duet');

        const triptychBtn = screen.getByRole('button', { name: /^Triptych$/i });
        expect(triptychBtn.textContent).toBe('Triptych');
    });

    it('renders active panel Framing & Zoom slider when a slot is assigned in Duet, and updates on slider input', () => {
        const twoPhotoMeta: BurstMetadata = {
            id: 'duet-zoom-slider',
            index: 0,
            total: 2,
            isTriptych: true,
            isDuet: true,
            frameSources: ['/p1.jpg', '/p2.jpg'],
            frameThumbs: ['/tp1.jpg', '/tp2.jpg'],
        };

        const onBurstPanChange = vi.fn();
        const burstPanOffsets = [
            { x: 0.5, y: 0.45, zoom: 1.0 },
            { x: 0.5, y: 0.45, zoom: 1.5 },
        ];

        const { rerender } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={twoPhotoMeta}
                panelCount={2}
                burstSelectedIndices={[0, 1]}
                burstActiveStep={0}
                burstPanOffsets={burstPanOffsets}
                onBurstPanChange={onBurstPanChange}
            />
        );

        // TOP panel is active and assigned Frame 1 -> TOP Framing zoom slider is visible
        expect(screen.getByText('TOP Framing')).not.toBeNull();
        const slider = screen.getByLabelText(/TOP Panel Zoom/i) as HTMLInputElement;
        expect(slider).not.toBeNull();
        expect(slider.value).toBe('1');
        expect(screen.getByText('1.0x')).not.toBeNull();

        // Change zoom on TOP panel slider to 1.75
        fireEvent.change(slider, { target: { value: '1.75' } });
        expect(onBurstPanChange).toHaveBeenCalledWith(0, {
            x: 0.5,
            y: 0.45,
            zoom: 1.75,
        });

        // Switch to Step 1 (BTM) where zoom is 1.5
        rerender(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={twoPhotoMeta}
                panelCount={2}
                burstSelectedIndices={[0, 1]}
                burstActiveStep={1}
                burstPanOffsets={burstPanOffsets}
                onBurstPanChange={onBurstPanChange}
            />
        );

        expect(screen.getByText('BTM Framing')).not.toBeNull();
        const btmSlider = screen.getByLabelText(/BTM Panel Zoom/i) as HTMLInputElement;
        expect(btmSlider.value).toBe('1.5');
        expect(screen.getByText('1.50x')).not.toBeNull();
    });

    it('hides active panel Framing & Zoom slider when the active slot is empty', () => {
        const twoPhotoMeta: BurstMetadata = {
            id: 'duet-zoom-empty-slot',
            index: 0,
            total: 2,
            isTriptych: true,
            isDuet: true,
            frameSources: ['/p1.jpg', '/p2.jpg'],
            frameThumbs: ['/tp1.jpg', '/tp2.jpg'],
        };

        render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="burst"
                burst={twoPhotoMeta}
                panelCount={2}
                burstSelectedIndices={[0, null]}
                burstActiveStep={1}
                burstPanOffsets={[
                    { x: 0.5, y: 0.45, zoom: 1.0 },
                    { x: 0.5, y: 0.45, zoom: 1.0 },
                ]}
            />
        );

        // BTM slot is active but Empty -> framing zoom slider should NOT be rendered
        expect(screen.queryByText(/BTM Framing/i)).toBeNull();
        expect(screen.queryByLabelText(/BTM Panel Zoom/i)).toBeNull();
    });

    it('renders Solo Background section with inline color picker in header and Frosted | Solid toggle below', () => {
        const setPaddedConfig = vi.fn();
        const onCropChange = vi.fn();
        const setSelectedPresetId = vi.fn();

        const { container } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="solo"
                paddedConfig={{ style: 'frosted', customColor: '#0a0a14', cardScale: 0.92, cardCornerRadius: 24 }}
                setPaddedConfig={setPaddedConfig}
                onCropChange={onCropChange}
                setSelectedPresetId={setSelectedPresetId}
                activeCrop={{ x: 0, y: 0, width: 1, height: 1, zoom: 1.0, centerX: 0.5, centerY: 0.5 }}
            />
        );

        // Header line has Background label and inline tint row
        const bgHeader = container.querySelector('.story-export-modal__background-header');
        expect(bgHeader).not.toBeNull();
        expect(bgHeader?.textContent).toContain('Background');

        // Color picker and swatches are located inside the header tint row
        const headerTint = bgHeader?.querySelector('.story-export-modal__background-header-tint');
        expect(headerTint).not.toBeNull();
        expect(headerTint?.querySelectorAll('.story-export-modal__quick-swatch').length).toBeGreaterThan(0);
        expect(headerTint?.querySelector('.story-export-modal__color-picker')).not.toBeNull();

        // Second row has Frosted and Solid toggle
        const frostedBtn = screen.getByRole('button', { name: 'Frosted' });
        const solidBtn = screen.getByRole('button', { name: 'Solid' });
        expect(frostedBtn).not.toBeNull();
        expect(solidBtn).not.toBeNull();

        // Clicking Solid updates paddedConfig without automatically switching mode or changing crop
        fireEvent.click(solidBtn);
        expect(setPaddedConfig).toHaveBeenCalled();
        expect(onCropChange).not.toHaveBeenCalled();
        expect(setSelectedPresetId).not.toHaveBeenCalled();
    });

    it('wraps Solo Selected Photo section inside padded-settings for outline and frosting consistency', () => {
        const multiPhotoMeta: BurstMetadata = {
            id: 'solo-curated-multi',
            index: 0,
            total: 3,
            isTriptych: true,
            frameSources: ['/p1.jpg', '/p2.jpg', '/p3.jpg'],
            frameThumbs: ['/tp1.jpg', '/tp2.jpg', '/tp3.jpg'],
        };

        const { container } = render(
            <StoryLayoutTab
                {...baseProps}
                activeMode="solo"
                burst={multiPhotoMeta}
            />
        );

        const selector = container.querySelector('.story-export-modal__burst-selector');
        expect(selector).not.toBeNull();
        const parentPaddedSettings = selector?.closest('.story-export-modal__padded-settings');
        expect(parentPaddedSettings).not.toBeNull();
    });
});

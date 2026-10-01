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
        expect(isFrameValidForWizardStep(2, 1, slots, total)).toBe(true);  // valid MID
        expect(isFrameValidForWizardStep(3, 1, slots, total)).toBe(true);  // valid MID
        expect(isFrameValidForWizardStep(4, 1, slots, total)).toBe(true);  // valid MID
        expect(isFrameValidForWizardStep(5, 1, slots, total)).toBe(false); // last frame (no room for BTM)
    });

    it('validates Step 2 (BTM): must be strictly after MID', () => {
        // TOP is index 1, MID is index 3 (Frame 4)
        const slots = [1, 3, null];
        expect(isFrameValidForWizardStep(0, 2, slots, total)).toBe(false);
        expect(isFrameValidForWizardStep(1, 2, slots, total)).toBe(false);
        expect(isFrameValidForWizardStep(2, 2, slots, total)).toBe(false);
        expect(isFrameValidForWizardStep(3, 2, slots, total)).toBe(false); // == MID
        expect(isFrameValidForWizardStep(4, 2, slots, total)).toBe(true);  // valid BTM
        expect(isFrameValidForWizardStep(5, 2, slots, total)).toBe(true);  // valid BTM
    });

    it('returns false when prerequisites are missing', () => {
        expect(isFrameValidForWizardStep(2, 1, [null, null, null], total)).toBe(false); // MID without TOP
        expect(isFrameValidForWizardStep(4, 2, [1, null, null], total)).toBe(false);    // BTM without MID
        expect(isFrameValidForWizardStep(-1, 0, [null, null, null], total)).toBe(false);
        expect(isFrameValidForWizardStep(6, 0, [null, null, null], total)).toBe(false);
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
        const { container } = render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[1, null, null]}
            />
        );

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
        const { container } = render(
            <StoryLayoutTab
                {...defaultProps}
                burstSelectedIndices={[0, 2, 4]}
            />
        );

        // Starts on TOP (step 0). Click Frame 3 (index 2) which is MID
        const thumbs = container.querySelectorAll<HTMLButtonElement>('.story-export-modal__burst-thumb');
        fireEvent.click(thumbs[2]);

        // Active step switches to MID (step 1)
        const wizardGroup = screen.getByRole('group', { name: /Burst Wizard Steps/i });
        const stepButtons = wizardGroup.querySelectorAll('button');
        expect(stepButtons[1].className).toContain('story-export-modal__pill--active');
    });
});

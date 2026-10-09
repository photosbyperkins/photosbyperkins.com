import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { StoryFramesTab } from './StoryFramesTab';
import { STORY_FRAME_DEFINITIONS } from '../storyFrames/frameDefinitions';
import { STORY_FRAME_CATEGORIES, type StoryFrameId } from '../storyFrames/types';
import { StoryPanelLayoutContext, type StoryPanelLayout } from '../storyStudio/panelLayout';

describe('StoryFramesTab', () => {
    const mockProps = {
        activeFrameId: 'instant-film' as StoryFrameId,
        setActiveFrameId: vi.fn(),
        frames: STORY_FRAME_DEFINITIONS,
        recentFrameIds: [] as StoryFrameId[],
        frameColorChoice: 'signature' as const,
        setFrameColorChoice: vi.fn(),
        frameCustomColor: '#ffffff',
        setFrameCustomColor: vi.fn(),
        effectiveFrameColor: '#ffffff',
        setIsDownloaded: vi.fn(),
        isFrameAnimated: false,
        setIsFrameAnimated: vi.fn(),
        videoSupported: true,
    };

    const renderWithLayout = (layout: StoryPanelLayout, props: Partial<typeof mockProps> = {}) =>
        render(
            <StoryPanelLayoutContext.Provider value={layout}>
                <StoryFramesTab {...mockProps} {...props} />
            </StoryPanelLayoutContext.Provider>
        );

    const openTint = () => fireEvent.click(screen.getByRole('button', { name: /Change tint/i }));
    const animateButton = (name: 'On' | 'Off') =>
        screen.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }) as HTMLButtonElement;
    const sectionTitles = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('.story-thumb-section')).map(
            (s) => s.querySelector('.story-thumb-section__title')?.textContent ?? null
        );

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('highlights the selected frame thumb instead of a header badge', () => {
        const { container } = render(<StoryFramesTab {...mockProps} />);

        const selected = container.querySelectorAll('.story-thumb--selected');
        expect(selected).toHaveLength(1);
        expect(selected[0].getAttribute('aria-pressed')).toBe('true');
        expect(selected[0].querySelector('.story-thumb__label')?.textContent).toBe('Polaroid');
        expect(container.querySelector('.story-export-modal__frame-current-badge')).toBeNull();
    });

    it('keeps tint swatches behind the Tint trigger and applies a preset on click', () => {
        render(<StoryFramesTab {...mockProps} />);

        // Popover is closed initially
        expect(screen.queryByRole('button', { name: /^Frame tint: Gold$/i })).toBeNull();
        const trigger = screen.getByRole('button', { name: /Frame tint: Default\. Change tint/i });
        expect(trigger.getAttribute('aria-expanded')).toBe('false');

        openTint();
        expect(trigger.getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: /^Frame tint: Gold$/i }));

        expect(mockProps.setFrameColorChoice).toHaveBeenCalledWith('gold');
        expect(mockProps.setFrameCustomColor).toHaveBeenCalledWith('#f59e0b');
        expect(mockProps.setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('closes the tint popover on Escape', () => {
        render(<StoryFramesTab {...mockProps} />);
        openTint();
        expect(document.getElementById('story-tint-popover')).not.toBeNull();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(document.getElementById('story-tint-popover')).toBeNull();
    });

    it('has no category chips; lists None first, then one titled section per category', () => {
        const { container } = render(<StoryFramesTab {...mockProps} />);

        expect(screen.queryAllByRole('tab')).toHaveLength(0);
        expect(container.querySelector('.story-chip-row')).toBeNull();

        const themeLabels = STORY_FRAME_CATEGORIES.filter(
            (c) => c.group === 'themes' && STORY_FRAME_DEFINITIONS.some((f) => f.category === c.id)
        ).map((c) => c.label);
        expect(sectionTitles(container)).toEqual(themeLabels);

        // None is pinned as the first thumb of the first section (no untitled section of its own)
        expect(container.querySelector('.story-thumb-section--untitled')).toBeNull();
        // Every frame is listed exactly once
        expect(container.querySelectorAll('.story-thumb')).toHaveLength(STORY_FRAME_DEFINITIONS.length);

        const derby = screen.getByRole('group', { name: 'Derby' });
        const derbyCount = STORY_FRAME_DEFINITIONS.filter((f) => f.category === 'derby').length;
        const derbyThumbs = within(derby).getAllByRole('button');
        expect(derbyThumbs).toHaveLength(derbyCount + 1);
        expect(derbyThumbs[0].querySelector('.story-thumb__label')?.textContent).toBe('None');
        // Section header: count (excluding None) + tagline
        const derbySection = derby.closest('.story-thumb-section')!;
        expect(derbySection.querySelector('.story-thumb-section__count')?.textContent).toBe(String(derbyCount));
        expect(derbySection.querySelector('.story-thumb-section__desc')?.textContent).toBe(
            STORY_FRAME_CATEGORIES.find((c) => c.id === 'derby')!.vibe
        );
    });

    it('pins None first in the first section in the filmstrip too, so its title sits flush left', () => {
        const { container } = renderWithLayout({ mode: 'sheet', browse: 'strip' });
        expect(container.querySelector('.story-thumb-section--untitled')).toBeNull();
        const first = container.querySelector('.story-thumb-section')!;
        expect(first.querySelector('.story-thumb-section__title')?.textContent).toBe('Derby');
        expect(first.querySelector('.story-thumb__label')?.textContent).toBe('None');
    });

    it('shows a Recent section first, led by None, with at most 4 recent frames', () => {
        const recent = STORY_FRAME_DEFINITIONS.filter((f) => f.id !== 'none')
            .slice(0, 6)
            .map((f) => f.id);
        const { container } = render(<StoryFramesTab {...mockProps} recentFrameIds={recent} />);

        expect(sectionTitles(container)[0]).toBe('Recent');
        const recentGroup = screen.getByRole('group', { name: 'Recent' });
        const labels = within(recentGroup)
            .getAllByRole('button')
            .map((b) => b.querySelector('.story-thumb__label')?.textContent);
        const expected = recent.slice(0, 4).map((id) => STORY_FRAME_DEFINITIONS.find((f) => f.id === id)!.label);
        expect(labels).toEqual(['None', ...expected]);
        // The count excludes None
        expect(
            recentGroup.closest('.story-thumb-section')!.querySelector('.story-thumb-section__count')?.textContent
        ).toBe('4');
    });

    it('marks only the first copy of a selected frame that is also in Recent', () => {
        const { container } = render(
            <StoryFramesTab {...mockProps} activeFrameId="instant-film" recentFrameIds={['instant-film']} />
        );
        const pressed = container.querySelectorAll('[data-thumb-key="instant-film"][aria-pressed="true"]');
        expect(pressed).toHaveLength(1);
        const recentGroup = screen.getByRole('group', { name: 'Recent' });
        expect(recentGroup.querySelector('[data-thumb-key="instant-film"]')?.getAttribute('aria-pressed')).toBe('true');
        expect(container.querySelectorAll('[data-thumb-key="instant-film"]')).toHaveLength(2);
    });

    it('is a single Tab stop with arrow-key / Home / End navigation', () => {
        const { container } = render(<StoryFramesTab {...mockProps} />);
        const thumbs = Array.from(container.querySelectorAll<HTMLElement>('[data-thumb-key]'));
        const tabbable = thumbs.filter((t) => t.tabIndex === 0);
        expect(tabbable).toHaveLength(1);
        // The selected thumb is the Tab stop
        expect(tabbable[0].getAttribute('data-thumb-key')).toBe('instant-film');

        thumbs[0].focus();
        fireEvent.keyDown(thumbs[0], { key: 'ArrowRight' });
        expect(document.activeElement).toBe(thumbs[1]);
        expect(thumbs[1].tabIndex).toBe(0);
        expect(thumbs[0].tabIndex).toBe(-1);

        fireEvent.keyDown(thumbs[1], { key: 'End' });
        expect(document.activeElement).toBe(thumbs[thumbs.length - 1]);
        fireEvent.keyDown(thumbs[thumbs.length - 1], { key: 'Home' });
        expect(document.activeElement).toBe(thumbs[0]);
    });

    it('previews a hovered frame and stops when the pointer leaves', () => {
        const onPreviewFrame = vi.fn();
        const { container } = render(<StoryFramesTab {...mockProps} onPreviewFrame={onPreviewFrame} />);
        const target = container.querySelector<HTMLElement>('[data-thumb-key="film-strip"]')!;

        fireEvent.pointerOver(target, { pointerType: 'mouse' });
        expect(onPreviewFrame).toHaveBeenLastCalledWith('film-strip');
        // Touch never previews
        fireEvent.pointerOver(container.querySelector('[data-thumb-key="none"]')!, { pointerType: 'touch' });
        expect(onPreviewFrame).toHaveBeenCalledTimes(1);

        fireEvent.pointerLeave(container.querySelector('#story-export-frames-grid')!, { pointerType: 'mouse' });
        expect(onPreviewFrame).toHaveBeenLastCalledWith(null);
    });

    it('opens a "Jump to" menu from a filmstrip section title and closes it on Escape', () => {
        renderWithLayout({ mode: 'sheet', browse: 'strip' });
        const opener = screen.getByRole('button', { name: 'Derby, jump to section' });
        expect(opener.getAttribute('aria-haspopup')).toBe('menu');

        fireEvent.click(opener);
        const menu = screen.getByRole('menu', { name: 'Jump to section' });
        expect(opener.getAttribute('aria-expanded')).toBe('true');
        expect(within(menu).getAllByRole('menuitem').length).toBeGreaterThan(1);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(opener);
    });

    it('jumps to a section from the menu', () => {
        renderWithLayout({ mode: 'sheet', browse: 'strip' });
        fireEvent.click(screen.getByRole('button', { name: 'Derby, jump to section' }));
        const menu = screen.getByRole('menu');
        const target = within(menu).getAllByRole('menuitem').at(-1)!;
        const sectionTitle = target.querySelector('span')!.textContent!;
        fireEvent.click(target);

        expect(screen.queryByRole('menu')).toBeNull();
        const group = screen.getByRole('group', { name: sectionTitle });
        expect(document.activeElement).toBe(within(group).getAllByRole('button')[0]);
    });

    it('selects a new frame when a frame thumb is clicked', () => {
        render(<StoryFramesTab {...mockProps} />);

        const targetFrame = STORY_FRAME_DEFINITIONS[1];
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${targetFrame.label}$`, 'i') }));

        expect(mockProps.setActiveFrameId).toHaveBeenCalledWith(targetFrame.id);
        expect(mockProps.setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('hides the Tint trigger when activeFrameId is none', () => {
        render(<StoryFramesTab {...mockProps} activeFrameId="none" />);
        expect(screen.queryByRole('button', { name: /Change tint/i })).toBeNull();
    });

    it('updates custom color when the color input value changes', () => {
        render(<StoryFramesTab {...mockProps} />);
        openTint();

        fireEvent.change(screen.getByLabelText(/Custom frame tint color/i), { target: { value: '#10b981' } });

        expect(mockProps.setFrameColorChoice).toHaveBeenCalledWith('custom');
        expect(mockProps.setFrameCustomColor).toHaveBeenCalledWith('#10b981');
        expect(mockProps.setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('toggles animation with the Animate Off / On segmented control', () => {
        const { rerender } = render(<StoryFramesTab {...mockProps} isFrameAnimated={false} />);

        expect(screen.getByRole('group', { name: /^Animate$/i })).toBeDefined();
        expect(animateButton('Off').getAttribute('aria-pressed')).toBe('true');
        expect(animateButton('On').getAttribute('aria-pressed')).toBe('false');
        expect(animateButton('On').disabled).toBe(false);

        // Clicking the already-active side is a no-op
        fireEvent.click(animateButton('Off'));
        expect(mockProps.setIsFrameAnimated).not.toHaveBeenCalled();

        fireEvent.click(animateButton('On'));
        expect(mockProps.setIsFrameAnimated).toHaveBeenCalledWith(true);

        rerender(<StoryFramesTab {...mockProps} isFrameAnimated={true} />);
        expect(animateButton('On').getAttribute('aria-pressed')).toBe('true');
        expect(animateButton('On').classList.contains('story-export-modal__scores-btn--active')).toBe(true);
        fireEvent.click(animateButton('Off'));
        expect(mockProps.setIsFrameAnimated).toHaveBeenLastCalledWith(false);
    });

    it('disables the Animate toggle when activeFrameId is none', () => {
        render(<StoryFramesTab {...mockProps} activeFrameId="none" isFrameAnimated={true} />);

        expect(animateButton('On').disabled).toBe(true);
        expect(animateButton('Off').disabled).toBe(true);
        // Shown as Off even though the preference is on
        expect(animateButton('Off').getAttribute('aria-pressed')).toBe('true');
        const group = screen.getByRole('group', { name: /^Animate$/i });
        expect(group.getAttribute('aria-describedby')).toBe('story-frames-animate-hint');
        expect(group.classList.contains('is-disabled')).toBe(true);
        expect(screen.getByText('Pick a frame to animate').id).toBe('story-frames-animate-hint');
    });

    it('disables the Animate toggle when video is not supported', () => {
        render(<StoryFramesTab {...mockProps} videoSupported={false} />);

        expect(animateButton('On').disabled).toBe(true);
        expect(screen.getByText(/Video export isn.t supported in this browser/i)).not.toBeNull();
    });

    it('renders section grids in grid browse mode and a filmstrip in strip mode', () => {
        const { container, unmount } = renderWithLayout({ mode: 'side', browse: 'grid' });
        expect(container.querySelector('#story-export-frames-grid.story-thumbs--grid')).not.toBeNull();
        expect(container.querySelectorAll('.story-thumb-section__items').length).toBeGreaterThan(1);
        unmount();

        const strip = renderWithLayout({ mode: 'sheet', browse: 'strip' });
        expect(strip.container.querySelector('#story-export-frames-grid.story-thumbs--strip')).not.toBeNull();
        expect(strip.container.querySelectorAll('.story-thumb-section__header').length).toBeGreaterThan(1);
    });

    it('shows the current photo under each frame thumb when provided', () => {
        const { container } = render(<StoryFramesTab {...mockProps} previewImageUrl="/photos/match_thumb.jpg" />);
        const photos = container.querySelectorAll('.story-thumb__photo');
        expect(photos.length).toBe(STORY_FRAME_DEFINITIONS.length);
        expect(photos[0].getAttribute('src')).toBe('/photos/match_thumb.jpg');
    });
});

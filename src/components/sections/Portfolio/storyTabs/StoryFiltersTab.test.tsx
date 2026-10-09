import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { StoryFiltersTab } from './StoryFiltersTab';
import { STORY_PHOTO_FILTERS } from '../../../../utils/storyCanvas';
import { StoryPanelLayoutContext } from '../storyStudio/panelLayout';

describe('StoryFiltersTab', () => {
    afterEach(() => {
        cleanup();
    });
    it('renders all filter pills and displays "None" as default active badge', () => {
        const setActiveFilterId = vi.fn();
        const setFilterStrength = vi.fn();
        const setIsDownloaded = vi.fn();

        const { container } = render(
            <StoryFiltersTab
                activeFilterId="none"
                setActiveFilterId={setActiveFilterId}
                filterStrength={1.0}
                setFilterStrength={setFilterStrength}
                setIsDownloaded={setIsDownloaded}
            />
        );

        // Selected thumb is 'None'
        const badge = container.querySelector('.story-thumb--selected .story-thumb__label');
        expect(badge?.textContent).toBe('None');

        // Strength slider should NOT be present when filter is 'none'
        expect(screen.queryByRole('slider')).toBeNull();
        expect(screen.getByText('Pick a filter to adjust its strength')).toBeDefined();

        // Click a filter pill (exact name 'Photo filter: Mono')
        const bwBtn = screen.getByRole('button', { name: /^photo filter: mono$/i });
        fireEvent.click(bwBtn);

        expect(setActiveFilterId).toHaveBeenCalledWith('bw');
        expect(setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('renders the filter strength slider when an active filter is chosen', () => {
        const setActiveFilterId = vi.fn();
        const setFilterStrength = vi.fn();
        const setIsDownloaded = vi.fn();

        const { container } = render(
            <StoryFiltersTab
                activeFilterId="warm"
                setActiveFilterId={setActiveFilterId}
                filterStrength={0.8}
                setFilterStrength={setFilterStrength}
                setIsDownloaded={setIsDownloaded}
            />
        );

        // Selected thumb shows the active filter
        const badge = container.querySelector('.story-thumb--selected .story-thumb__label');
        expect(badge?.textContent).toBe('Vintage');

        // Strength slider is rendered
        const slider = screen.getByRole('slider') as HTMLInputElement;
        expect(slider).toBeDefined();
        expect(slider.value).toBe('0.8');

        // Change slider value
        fireEvent.change(slider, { target: { value: '0.5' } });
        expect(setFilterStrength).toHaveBeenCalledWith(0.5);
        expect(setIsDownloaded).toHaveBeenCalledWith(false);
    });

    it('describes the selected filter under the strength row', () => {
        const { container } = render(
            <StoryFiltersTab
                activeFilterId="warm"
                setActiveFilterId={vi.fn()}
                filterStrength={0.8}
                setFilterStrength={vi.fn()}
                setIsDownloaded={vi.fn()}
            />
        );

        const caption = container.querySelector('.story-filter-caption')!;
        expect(caption.querySelector('.story-filter-info__name')?.textContent).toBe('Vintage');
        expect(caption.querySelector('.story-filter-info__desc')?.textContent).toBe(
            STORY_PHOTO_FILTERS.find((f) => f.id === 'warm')!.description
        );
    });

    it('opens the strength slider on demand in the filmstrip', () => {
        const setActiveFilterId = vi.fn();
        render(
            <StoryPanelLayoutContext.Provider value={{ mode: 'sheet', browse: 'strip' }}>
                <StoryFiltersTab
                    activeFilterId="warm"
                    setActiveFilterId={setActiveFilterId}
                    filterStrength={0.8}
                    setFilterStrength={vi.fn()}
                    setIsDownloaded={vi.fn()}
                />
            </StoryPanelLayoutContext.Provider>
        );

        // One compact row: filter info + a Strength pill; no slider yet
        expect(screen.queryByRole('slider')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Adjust filter strength (80%)' }));
        expect(screen.getByRole('slider')).toBeDefined();

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));
        expect(screen.queryByRole('slider')).toBeNull();

        // Tapping the selected filter again toggles the slider without re-selecting it
        const vintage = screen.getByRole('button', { name: /^photo filter: vintage$/i });
        fireEvent.click(vintage);
        expect(screen.getByRole('slider')).toBeDefined();
        fireEvent.click(vintage);
        expect(screen.queryByRole('slider')).toBeNull();
        expect(setActiveFilterId).not.toHaveBeenCalled();
    });

    it('applies previewImageUrl to filter thumbs', () => {
        const { container } = render(
            <StoryFiltersTab
                activeFilterId="none"
                setActiveFilterId={vi.fn()}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                previewImageUrl="/photos/sample_thumb.jpg"
                setIsDownloaded={vi.fn()}
            />
        );

        const swatches = container.querySelectorAll('.story-thumb__photo');
        expect(swatches.length).toBe(22);
        expect((swatches[0] as HTMLImageElement).src).toContain('/photos/sample_thumb.jpg');
    });

    it('renders selective color filter pills and handles their selection', () => {
        const setActiveFilterId = vi.fn();
        const setIsDownloaded = vi.fn();

        const { container } = render(
            <StoryFiltersTab
                activeFilterId="selective-red"
                setActiveFilterId={setActiveFilterId}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={setIsDownloaded}
            />
        );

        // Selected thumb is Red Pop
        const badge = container.querySelector('.story-thumb--selected .story-thumb__label');
        expect(badge?.textContent).toBe('Red Pop');

        // Verify Green Pop, Blue Pop, Yellow Pop, Purple Pop buttons exist
        const greenBtn = screen.getByRole('button', { name: /^photo filter: green pop$/i });
        const blueBtn = screen.getByRole('button', { name: /^photo filter: blue pop$/i });
        const yellowBtn = screen.getByRole('button', { name: /^photo filter: yellow pop$/i });
        const purpleBtn = screen.getByRole('button', { name: /^photo filter: purple pop$/i });

        fireEvent.click(greenBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('selective-green');
        expect(setIsDownloaded).toHaveBeenCalledWith(false);

        fireEvent.click(blueBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('selective-blue');

        fireEvent.click(yellowBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('selective-yellow');

        fireEvent.click(purpleBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('selective-purple');
    });

    it('renders new cinematic and analog filters', () => {
        const setActiveFilterId = vi.fn();
        render(
            <StoryFiltersTab
                activeFilterId="none"
                setActiveFilterId={setActiveFilterId}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={vi.fn()}
            />
        );

        const cinematicBtn = screen.getByRole('button', { name: /^photo filter: teal & orange$/i });
        const neonBtn = screen.getByRole('button', { name: /^photo filter: neon$/i });
        const duotoneBtn = screen.getByRole('button', { name: /^photo filter: duotone$/i });
        const bleachBtn = screen.getByRole('button', { name: /^photo filter: bleach$/i });

        fireEvent.click(cinematicBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('cinematic');

        fireEvent.click(neonBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('neon');

        fireEvent.click(duotoneBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('duotone');

        fireEvent.click(bleachBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('bleach');
    });

    it('does not re-select the filter that is already active', () => {
        const setActiveFilterId = vi.fn();
        const setIsDownloaded = vi.fn();
        render(
            <StoryFiltersTab
                activeFilterId="cinematic"
                setActiveFilterId={setActiveFilterId}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={setIsDownloaded}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /^photo filter: teal & orange$/i }));
        expect(setActiveFilterId).not.toHaveBeenCalled();
        expect(setIsDownloaded).not.toHaveBeenCalled();
    });

    it('lists None first, then titled category sections instead of chips', () => {
        const { container } = render(
            <StoryFiltersTab
                activeFilterId="none"
                setActiveFilterId={vi.fn()}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={vi.fn()}
            />
        );

        expect(screen.queryAllByRole('tab')).toHaveLength(0);
        expect(container.querySelector('.story-chip-row')).toBeNull();

        const sections = Array.from(container.querySelectorAll('.story-thumb-section'));
        const titles = sections.map((s) => s.querySelector('.story-thumb-section__title')?.textContent ?? null);
        // No history yet, so no Recent section. None is pinned as the first thumb of the first section.
        expect(titles).toEqual(['Classic', 'Cinematic', 'Pop', 'Stylized']);
        expect(sections.map((s) => s.querySelectorAll('.story-thumb').length)).toEqual([8, 7, 5, 2]);
        const classic = screen.getByRole('group', { name: 'Classic' });
        expect(within(classic).getAllByRole('button')[0].getAttribute('aria-label')).toBe('Photo filter: None');

        const stylized = screen.getByRole('group', { name: 'Stylized' });
        expect(within(stylized).getByRole('button', { name: /^photo filter: neon$/i })).toBeDefined();
        expect(within(stylized).getByRole('button', { name: /^photo filter: duotone$/i })).toBeDefined();
    });

    it('shows recently used filters in a Recent section (max 4, newest first)', () => {
        const setActiveFilterId = vi.fn();
        render(
            <StoryFiltersTab
                activeFilterId="none"
                setActiveFilterId={setActiveFilterId}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={vi.fn()}
                recentFilterIds={['neon', 'none', 'bw', 'cinematic', 'warm', 'duotone']}
            />
        );

        const recent = screen.getByRole('group', { name: 'Recent' });
        const names = within(recent)
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label'));
        expect(names).toEqual([
            'Photo filter: None',
            'Photo filter: Neon',
            'Photo filter: Mono',
            'Photo filter: Teal & Orange',
            'Photo filter: Vintage',
        ]);

        fireEvent.click(within(recent).getByRole('button', { name: /^photo filter: neon$/i }));
        expect(setActiveFilterId).toHaveBeenCalledWith('neon');
    });

    it('previews a hovered filter', () => {
        const onPreviewFilter = vi.fn();
        render(
            <StoryFiltersTab
                activeFilterId="none"
                setActiveFilterId={vi.fn()}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={vi.fn()}
                onPreviewFilter={onPreviewFilter}
            />
        );

        fireEvent.pointerOver(screen.getByRole('button', { name: /^photo filter: neon$/i }), { pointerType: 'mouse' });
        expect(onPreviewFilter).toHaveBeenLastCalledWith('neon');
    });
});

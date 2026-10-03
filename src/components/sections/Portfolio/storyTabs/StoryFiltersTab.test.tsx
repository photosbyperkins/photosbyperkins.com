import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryFiltersTab } from './StoryFiltersTab';

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

        // Header badge shows 'None'
        const badge = container.querySelector('.story-export-modal__filter-current-badge');
        expect(badge?.textContent).toBe('None');

        // Strength slider should NOT be present when filter is 'none'
        expect(screen.queryByRole('slider')).toBeNull();

        // Click a filter pill (exact name 'Photo filter: B&W')
        const bwBtn = screen.getByRole('button', { name: /^photo filter: b&w$/i });
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

        // Header shows active badge
        const badge = container.querySelector('.story-export-modal__filter-current-badge');
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

    it('applies previewImageUrl to filter preview swatches', () => {
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

        const swatches = container.querySelectorAll('.story-export-modal__filter-preview-swatch');
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

        // Header shows Red Pop badge
        const badge = container.querySelector('.story-export-modal__filter-current-badge');
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
                activeFilterId="cinematic"
                setActiveFilterId={setActiveFilterId}
                filterStrength={1.0}
                setFilterStrength={vi.fn()}
                setIsDownloaded={vi.fn()}
            />
        );

        const cinematicBtn = screen.getByRole('button', { name: /^photo filter: cinematic$/i });
        const neonBtn = screen.getByRole('button', { name: /^photo filter: neon$/i });
        const duotoneBtn = screen.getByRole('button', { name: /^photo filter: duotone$/i });
        const bleachBtn = screen.getByRole('button', { name: /^photo filter: bleach$/i });

        fireEvent.click(neonBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('neon');

        fireEvent.click(duotoneBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('duotone');

        fireEvent.click(bleachBtn);
        expect(setActiveFilterId).toHaveBeenCalledWith('bleach');
    });
});

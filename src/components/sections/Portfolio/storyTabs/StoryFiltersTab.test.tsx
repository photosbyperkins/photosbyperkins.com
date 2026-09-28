import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryFiltersTab } from './StoryFiltersTab';

describe('StoryFiltersTab', () => {
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
        expect(swatches.length).toBeGreaterThan(0);
        expect((swatches[0] as HTMLImageElement).src).toContain('/photos/sample_thumb.jpg');
    });
});

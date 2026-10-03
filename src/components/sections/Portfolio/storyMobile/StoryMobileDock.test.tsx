import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryMobileDock } from './StoryMobileDock';
import { StoryLayoutTabIcon, StoryFiltersTabIcon, StoryFramesTabIcon, StoryBadgesTabIcon } from '../../../ui/icons';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';

const TABS: Array<{ id: StoryStudioTab; label: string; icon: React.FC<any> }> = [
    { id: 'layout', label: 'Layout', icon: StoryLayoutTabIcon },
    { id: 'filters', label: 'Filters', icon: StoryFiltersTabIcon },
    { id: 'frames', label: 'Frames', icon: StoryFramesTabIcon },
    { id: 'badges', label: 'Badges', icon: StoryBadgesTabIcon },
];

describe('StoryMobileDock', () => {
    afterEach(() => {
        cleanup();
    });
    it('renders all tab buttons with labels and accessibility attributes', () => {
        render(<StoryMobileDock tabs={TABS} activeTab="layout" isOpen={false} onTabClick={vi.fn()} />);

        const toolbar = screen.getByRole('toolbar', { name: /story editing tools/i });
        expect(toolbar).toBeDefined();

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(4);

        expect(screen.getByRole('button', { name: /layout/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /filters/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /frames/i })).toBeDefined();
        expect(screen.getByRole('button', { name: /badges/i })).toBeDefined();
    });

    it('highlights active tab only when isOpen is true', () => {
        const { rerender } = render(
            <StoryMobileDock tabs={TABS} activeTab="filters" isOpen={false} onTabClick={vi.fn()} />
        );

        const filtersBtn = screen.getByRole('button', { name: /filters/i });
        expect(filtersBtn.classList.contains('is-active')).toBe(false);
        expect(filtersBtn.getAttribute('aria-pressed')).toBe('false');

        rerender(<StoryMobileDock tabs={TABS} activeTab="filters" isOpen={true} onTabClick={vi.fn()} />);

        expect(filtersBtn.classList.contains('is-active')).toBe(true);
        expect(filtersBtn.getAttribute('aria-pressed')).toBe('true');
    });

    it('calls onTabClick with selected tab id when clicked', () => {
        const onTabClick = vi.fn();
        render(<StoryMobileDock tabs={TABS} activeTab="layout" isOpen={true} onTabClick={onTabClick} />);

        const framesBtn = screen.getByRole('button', { name: /frames/i });
        fireEvent.click(framesBtn);

        expect(onTabClick).toHaveBeenCalledTimes(1);
        expect(onTabClick).toHaveBeenCalledWith('frames');
    });

    it('stops event propagation on click and pointer down', () => {
        const onParentClick = vi.fn();
        const onParentPointerDown = vi.fn();

        render(
            <div onClick={onParentClick} onPointerDown={onParentPointerDown}>
                <StoryMobileDock tabs={TABS} activeTab="layout" isOpen={false} onTabClick={vi.fn()} />
            </div>
        );

        const toolbar = screen.getByRole('toolbar');
        fireEvent.click(toolbar);
        fireEvent.pointerDown(toolbar);

        expect(onParentClick).not.toHaveBeenCalled();
        expect(onParentPointerDown).not.toHaveBeenCalled();
    });
});

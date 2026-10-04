import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { StoryMobilePopover } from './StoryMobilePopover';
import { StoryLayoutTabIcon, StoryFiltersTabIcon, StoryFramesTabIcon, StoryBadgesTabIcon, type IconProps } from '../../../ui/icons';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';

const TABS: Array<{ id: StoryStudioTab; label: string; icon: React.FC<IconProps> }> = [
    { id: 'layout', label: 'Layout', icon: StoryLayoutTabIcon },
    { id: 'filters', label: 'Filters', icon: StoryFiltersTabIcon },
    { id: 'frames', label: 'Frames', icon: StoryFramesTabIcon },
    { id: 'badges', label: 'Badges', icon: StoryBadgesTabIcon },
];

describe('StoryMobilePopover', () => {
    afterEach(() => {
        cleanup();
    });

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <StoryMobilePopover isOpen={false} onClose={vi.fn()} activeTab="layout" tabs={TABS} onSelectTab={vi.fn()}>
                <div>Tab Content</div>
            </StoryMobilePopover>
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders dialog, backdrop, handle bar, 4-tab segmented strip, and children when isOpen is true', () => {
        render(
            <StoryMobilePopover isOpen={true} onClose={vi.fn()} activeTab="layout" tabs={TABS} onSelectTab={vi.fn()}>
                <div data-testid="test-content">Tab Content</div>
            </StoryMobilePopover>
        );

        const dialog = screen.getByRole('dialog', { name: /story editing controls/i });
        expect(dialog).toBeDefined();

        // 4 tabs are rendered
        const tablist = screen.getByRole('tablist', { name: /story editing categories/i });
        expect(tablist).toBeDefined();

        const layoutTab = within(tablist).getByRole('tab', { name: /layout/i });
        const filtersTab = within(tablist).getByRole('tab', { name: /filters/i });
        const framesTab = within(tablist).getByRole('tab', { name: /frames/i });
        const badgesTab = within(tablist).getByRole('tab', { name: /badges/i });

        expect(layoutTab.getAttribute('aria-selected')).toBe('true');
        expect(filtersTab.getAttribute('aria-selected')).toBe('false');
        expect(framesTab.getAttribute('aria-selected')).toBe('false');
        expect(badgesTab.getAttribute('aria-selected')).toBe('false');

        expect(screen.getByTestId('test-content')).toBeDefined();
    });

    it('calls onSelectTab when a tab button is clicked', () => {
        const onSelectTab = vi.fn();
        render(
            <StoryMobilePopover
                isOpen={true}
                onClose={vi.fn()}
                activeTab="layout"
                tabs={TABS}
                onSelectTab={onSelectTab}
            >
                <div>Tab Content</div>
            </StoryMobilePopover>
        );

        const filtersTab = screen.getByRole('tab', { name: /filters/i });
        fireEvent.click(filtersTab);

        expect(onSelectTab).toHaveBeenCalledWith('filters');
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(
            <StoryMobilePopover isOpen={true} onClose={onClose} activeTab="layout" tabs={TABS} onSelectTab={vi.fn()}>
                <div>Tab Content</div>
            </StoryMobilePopover>
        );

        const closeBtn = screen.getByRole('button', { name: /close controls/i });
        fireEvent.click(closeBtn);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop scrim is clicked', () => {
        const onClose = vi.fn();
        const { baseElement } = render(
            <StoryMobilePopover isOpen={true} onClose={onClose} activeTab="layout" tabs={TABS} onSelectTab={vi.fn()}>
                <div>Tab Content</div>
            </StoryMobilePopover>
        );

        const backdrop = baseElement.querySelector('.story-mobile-popover__backdrop');
        expect(backdrop).not.toBeNull();
        fireEvent.click(backdrop!);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stops click and pointer down event propagation on dialog content', () => {
        const onParentClick = vi.fn();
        const onParentPointerDown = vi.fn();

        render(
            <div onClick={onParentClick} onPointerDown={onParentPointerDown}>
                <StoryMobilePopover
                    isOpen={true}
                    onClose={vi.fn()}
                    activeTab="layout"
                    tabs={TABS}
                    onSelectTab={vi.fn()}
                >
                    <div>Tab Content</div>
                </StoryMobilePopover>
            </div>
        );

        const dialog = screen.getByRole('dialog');
        fireEvent.click(dialog);
        fireEvent.pointerDown(dialog);

        expect(onParentClick).not.toHaveBeenCalled();
        expect(onParentPointerDown).not.toHaveBeenCalled();
    });
});

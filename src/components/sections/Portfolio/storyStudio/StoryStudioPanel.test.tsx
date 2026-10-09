import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { StoryStudioTab } from '../../../../hooks/useStoryStudio';
import type { StoryLayoutMode } from '../../../../hooks/useStoryLayoutMode';
import type { IconProps } from '../../../ui/icons';
import { StoryTabBar, type StudioTabDef } from './StoryTabBar';
import { StoryStudioPanel } from './StoryStudioPanel';
import { resolveBrowseLayout, STORY_GRID_MIN_HEIGHT, STORY_GRID_MIN_WIDTH, useStoryPanelLayout } from './panelLayout';

const Icon: React.FC<IconProps> = () => null;
const TABS: StudioTabDef[] = [
    { id: 'layout', label: 'Layout', icon: Icon },
    { id: 'filters', label: 'Filters', icon: Icon },
    { id: 'frames', label: 'Frames', icon: Icon },
    { id: 'badges', label: 'Badges', icon: Icon },
];

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('resolveBrowseLayout', () => {
    it('uses the grid only for a fine pointer in a wide-enough panel', () => {
        expect(resolveBrowseLayout(true, STORY_GRID_MIN_WIDTH)).toBe('grid');
        expect(resolveBrowseLayout(true, 0)).toBe('grid'); // not measured yet counts as wide
        expect(resolveBrowseLayout(true, STORY_GRID_MIN_WIDTH - 1)).toBe('strip');
        expect(resolveBrowseLayout(false, 1200)).toBe('strip');
        // Short panels (stacked tablet, sheet) use the filmstrip too
        expect(resolveBrowseLayout(true, 600, STORY_GRID_MIN_HEIGHT - 1)).toBe('strip');
        expect(resolveBrowseLayout(true, 600, STORY_GRID_MIN_HEIGHT)).toBe('grid');
        expect(resolveBrowseLayout(true, 600, 0)).toBe('grid'); // not measured yet
    });
});

describe('StoryTabBar', () => {
    it('exposes a labelled tablist with roving tabindex', () => {
        render(<StoryTabBar tabs={TABS} activeTab="filters" onTabClick={vi.fn()} />);

        expect(screen.getByRole('tablist', { name: 'Story Studio Navigation' })).not.toBeNull();
        const tabs = screen.getAllByRole('tab');
        expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false']);
        expect(tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1]);
        expect(tabs[1].id).toBe('story-studio-tab-filters');
        expect(tabs[1].getAttribute('aria-controls')).toBe('story-studio-tabpanel');
        expect(tabs[1].hasAttribute('aria-expanded')).toBe(false);
    });

    it('selects with arrow keys, Home and End, wrapping around', () => {
        const onTabClick = vi.fn();
        const onTabSelect = vi.fn();
        render(<StoryTabBar tabs={TABS} activeTab="layout" onTabClick={onTabClick} onTabSelect={onTabSelect} />);
        const layout = screen.getByRole('tab', { name: 'Layout' });

        fireEvent.keyDown(layout, { key: 'ArrowRight' });
        expect(onTabSelect).toHaveBeenLastCalledWith('filters');
        fireEvent.keyDown(layout, { key: 'ArrowLeft' });
        expect(onTabSelect).toHaveBeenLastCalledWith('badges');
        fireEvent.keyDown(layout, { key: 'End' });
        expect(onTabSelect).toHaveBeenLastCalledWith('badges');
        fireEvent.keyDown(layout, { key: 'Home' });
        expect(onTabSelect).toHaveBeenLastCalledWith('layout');

        // Keyboard selection never goes through the click (toggle) path
        expect(onTabClick).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('tab', { name: 'Frames' }));
        expect(onTabClick).toHaveBeenCalledWith('frames');
    });

    it('hides the active pill and reports expanded state when collapsed', () => {
        render(
            <StoryTabBar tabs={TABS} activeTab="layout" onTabClick={vi.fn()} showActivePill={false} expanded={false} />
        );
        const layout = screen.getByRole('tab', { name: 'Layout' });
        expect(layout.getAttribute('aria-selected')).toBe('true');
        expect(layout.getAttribute('aria-expanded')).toBe('false');
        expect(layout.classList.contains('is-active')).toBe(false);
        expect(layout.querySelector('.story-tab-bar__pill')).toBeNull();
    });
});

const LayoutProbe: React.FC = () => {
    const { mode, browse } = useStoryPanelLayout();
    return <span data-testid="probe">{`${mode}:${browse}`}</span>;
};

const PanelHarness: React.FC<{ mode: StoryLayoutMode; initialOpen?: boolean }> = ({ mode, initialOpen = false }) => {
    const [tab, setTab] = useState<StoryStudioTab>('layout');
    const [open, setOpen] = useState(initialOpen);
    return (
        <StoryStudioPanel
            mode={mode}
            tabs={TABS}
            activeTab={tab}
            onSelectTab={setTab}
            isSheetOpen={open}
            onSheetOpenChange={setOpen}
            footer={<button type="button">Download Story Card</button>}
        >
            <button type="button">{`${tab} control`}</button>
            <LayoutProbe />
        </StoryStudioPanel>
    );
};

describe('StoryStudioPanel', () => {
    it('side mode: content and footer are always rendered and provide the layout context', () => {
        const { container } = render(<PanelHarness mode="side" />);

        expect(container.querySelector('.story-studio-panel--side')).not.toBeNull();
        const tabpanel = screen.getByRole('tabpanel');
        expect(tabpanel.id).toBe('story-studio-tabpanel');
        expect(tabpanel.getAttribute('aria-labelledby')).toBe('story-studio-tab-layout');
        expect(screen.getByRole('button', { name: 'Download Story Card' })).not.toBeNull();
        expect(container.querySelector('.story-studio-panel__handle')).toBeNull();
        expect(screen.getByTestId('probe').textContent).toMatch(/^side:(grid|strip)$/);

        // Clicking the active tab does not collapse anything
        fireEvent.click(screen.getByRole('tab', { name: 'Layout' }));
        expect(screen.queryByRole('tabpanel')).not.toBeNull();
        fireEvent.click(screen.getByRole('tab', { name: 'Badges' }));
        expect(screen.getByRole('button', { name: 'badges control' })).not.toBeNull();
    });

    it('sheet mode: collapsed shows only tabs + footer; tab click toggles', () => {
        const { container } = render(<PanelHarness mode="sheet" />);

        expect(screen.queryByRole('tabpanel')).toBeNull();
        expect(screen.getByRole('button', { name: 'Download Story Card' })).not.toBeNull();
        expect(container.querySelector('.story-studio-panel__handle')).not.toBeNull();

        const frames = screen.getByRole('tab', { name: 'Frames' });
        fireEvent.click(frames);
        expect(screen.getByRole('button', { name: 'frames control' })).not.toBeNull();
        expect(frames.getAttribute('aria-expanded')).toBe('true');
        expect(container.querySelector('.story-studio-panel--open')).not.toBeNull();

        fireEvent.click(frames);
        expect(screen.queryByRole('tabpanel')).toBeNull();
        expect(frames.getAttribute('aria-expanded')).toBe('false');
    });

    it('sheet mode: keyboard selection opens without toggling closed', () => {
        render(<PanelHarness mode="sheet" />);
        const layout = screen.getByRole('tab', { name: 'Layout' });

        fireEvent.keyDown(layout, { key: 'ArrowRight' });
        expect(screen.getByRole('button', { name: 'filters control' })).not.toBeNull();

        fireEvent.keyDown(screen.getByRole('tab', { name: 'Filters' }), { key: 'ArrowRight' });
        expect(screen.getByRole('button', { name: 'frames control' })).not.toBeNull();
    });

    it('sheet mode: handle click toggles, backdrop click closes', () => {
        const { container } = render(<PanelHarness mode="sheet" />);
        const handle = container.querySelector('.story-studio-panel__handle') as HTMLElement;

        fireEvent.click(handle);
        expect(screen.queryByRole('tabpanel')).not.toBeNull();

        fireEvent.click(container.ownerDocument.querySelector('.story-studio-panel__backdrop') as HTMLElement);
        expect(screen.queryByRole('tabpanel')).toBeNull();

        fireEvent.click(handle);
        expect(screen.queryByRole('tabpanel')).not.toBeNull();
        fireEvent.click(handle);
        expect(screen.queryByRole('tabpanel')).toBeNull();
    });

    it('sheet mode: Escape collapses and stops propagation; focus returns to the active tab', () => {
        const outerEscape = vi.fn();
        window.addEventListener('keydown', outerEscape);
        try {
            render(<PanelHarness mode="sheet" initialOpen />);
            const control = screen.getByRole('button', { name: 'layout control' });
            control.focus();

            fireEvent.keyDown(control, { key: 'Escape' });
            expect(screen.queryByRole('tabpanel')).toBeNull();
            expect(outerEscape).not.toHaveBeenCalled();
            expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Layout' }));
        } finally {
            window.removeEventListener('keydown', outerEscape);
        }
    });

    it('sheet mode: Escape is left to an open popover first', () => {
        render(<PanelHarness mode="sheet" initialOpen />);
        const popover = document.createElement('div');
        popover.setAttribute('data-story-popover', '');
        document.body.appendChild(popover);
        try {
            fireEvent.keyDown(window, { key: 'Escape' });
            expect(screen.queryByRole('tabpanel')).not.toBeNull();
        } finally {
            popover.remove();
        }
    });
});

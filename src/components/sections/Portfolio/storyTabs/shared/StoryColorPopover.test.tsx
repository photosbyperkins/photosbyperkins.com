import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { StoryColorPopover, type StoryColorPreset } from './StoryColorPopover';

const PRESETS: StoryColorPreset[] = [
    { id: 'ink', label: 'Ink', color: '#0a0a14' },
    { id: 'red', label: 'Red', color: '#e60000' },
];

const renderPopover = () =>
    render(
        // Mirrors ModalShell, which stops pointerdown from bubbling out of the modal
        <div onPointerDown={(e) => e.stopPropagation()}>
            <button type="button">Elsewhere in modal</button>
            <StoryColorPopover
                popoverId="test-color-popover"
                triggerText="Color"
                ariaNoun="Background color"
                customAriaLabel="Custom background color"
                presets={PRESETS}
                activePresetId="ink"
                currentColor="#0a0a14"
                onSelectPreset={vi.fn()}
                onCustomColor={vi.fn()}
            />
        </div>
    );

describe('StoryColorPopover', () => {
    afterEach(cleanup);

    it('closes on an outside pointerdown even when an ancestor stops propagation', () => {
        renderPopover();
        fireEvent.click(screen.getByRole('button', { name: 'Background color: Ink. Change color' }));
        expect(document.getElementById('test-color-popover')).not.toBeNull();

        fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere in modal' }));
        expect(document.getElementById('test-color-popover')).toBeNull();
    });

    it('stays open when interacting inside the popover', () => {
        renderPopover();
        fireEvent.click(screen.getByRole('button', { name: 'Background color: Ink. Change color' }));
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Background color: Red' }));
        expect(document.getElementById('test-color-popover')).not.toBeNull();
    });

    it('closes on Escape', () => {
        renderPopover();
        fireEvent.click(screen.getByRole('button', { name: 'Background color: Ink. Change color' }));
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(document.getElementById('test-color-popover')).toBeNull();
    });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GearModal from './GearModal';
import { useAppStore } from '../../store/useAppStore';
import { GEAR_REGISTRY } from '../../data/gearData';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
            <div className={className} {...props}>
                {children}
            </div>
        ),
    },
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('GearModal', () => {
    const gearList = Object.values(GEAR_REGISTRY);

    beforeEach(() => {
        useAppStore.setState({ activeGear: null });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders nothing when activeGear is null', () => {
        render(
            <MemoryRouter>
                <GearModal />
            </MemoryRouter>
        );
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders gear specs and official link when activeGear is set', () => {
        const item = gearList[0];
        useAppStore.setState({ activeGear: item });

        render(
            <MemoryRouter>
                <GearModal />
            </MemoryRouter>
        );

        expect(screen.getByRole('dialog')).not.toBeNull();
        expect(screen.getAllByText(item.name).length).toBeGreaterThan(0);
        expect(screen.getByText(new RegExp(`View Photos Taken With This ${item.type === 'camera' ? 'Camera' : 'Lens'}`, 'i'))).not.toBeNull();
    });

    it('closes modal when the close button is clicked', () => {
        const item = gearList[1];
        useAppStore.setState({ activeGear: item });

        render(
            <MemoryRouter>
                <GearModal />
            </MemoryRouter>
        );

        const closeBtn = screen.getByRole('button', { name: /^Close$/i });
        fireEvent.click(closeBtn);

        expect(useAppStore.getState().activeGear).toBeNull();
    });
});

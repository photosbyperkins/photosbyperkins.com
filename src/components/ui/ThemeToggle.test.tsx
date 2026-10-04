import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { useAppStore } from '../../store/useAppStore';

describe('ThemeToggle', () => {
    beforeEach(() => {
        useAppStore.setState({ activeTheme: 'dark' });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders toggle button with accessible label', () => {
        render(<ThemeToggle variant="nav" />);
        const button = screen.getByRole('button', { name: 'Toggle theme' });
        expect(button).toBeDefined();
        expect(button.className).toContain('theme-toggle-nav');
    });

    it('renders floating variant with visibility classes', () => {
        render(<ThemeToggle variant="floating" />);
        const button = screen.getByRole('button', { name: 'Toggle theme' });
        expect(button.className).toContain('theme-toggle-floating');
    });

    it('toggles theme in app store when clicked', () => {
        render(<ThemeToggle variant="nav" />);
        const button = screen.getByRole('button', { name: 'Toggle theme' });

        expect(useAppStore.getState().activeTheme).toBe('dark');

        fireEvent.click(button);
        expect(useAppStore.getState().activeTheme).toBe('light');

        fireEvent.click(button);
        expect(useAppStore.getState().activeTheme).toBe('dark');
    });
});

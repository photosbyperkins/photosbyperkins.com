import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { getPerfVitalsStore } from '../../utils/rum';

function ProblemChild({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error('Test render explosion');
    }
    return <div data-testid="healthy-child">All systems nominal</div>;
}

describe('ErrorBoundary', () => {
    beforeEach(() => {
        getPerfVitalsStore().reset();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it('renders children normally when no error is thrown', () => {
        render(
            <ErrorBoundary name="Portfolio">
                <ProblemChild shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('healthy-child').textContent).toBe('All systems nominal');
        expect(getPerfVitalsStore().errors).toHaveLength(0);
    });

    it('catches render errors, records to window.__PERF_VITALS__.errors, and recovers on "Reload view"', () => {
        let fail = true;
        const onReset = vi.fn(() => {
            fail = false;
        });

        function RecoverableChild() {
            if (fail) {
                throw new Error('Portfolio chunk render failure');
            }
            return <div data-testid="recovered-child">Recovered view</div>;
        }

        render(
            <ErrorBoundary name="Portfolio" variant="section" onReset={onReset}>
                <RecoverableChild />
            </ErrorBoundary>
        );

        const alert = screen.getByRole('alert');
        expect(alert.getAttribute('data-boundary')).toBe('Portfolio');
        expect(screen.getByText(/Something went wrong in this view/i)).not.toBeNull();

        const store = getPerfVitalsStore();
        expect(store.errors).toHaveLength(1);
        expect(store.errors[0].boundary).toBe('Portfolio');
        expect(store.errors[0].message).toBe('Portfolio chunk render failure');

        fireEvent.click(screen.getByRole('button', { name: /Reload view/i }));
        expect(onReset).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('recovered-child').textContent).toBe('Recovered view');
    });

    it('renders a Close button in overlay mode when onDismiss is provided', () => {
        const onDismiss = vi.fn();

        render(
            <ErrorBoundary name="StoryExportModal" variant="overlay" onDismiss={onDismiss}>
                <ProblemChild shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('alert')).not.toBeNull();
        const closeBtn = screen.getByRole('button', { name: /Close/i });
        fireEvent.click(closeBtn);

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('automatically resets error state when resetKeys change', () => {
        const { rerender } = render(
            <ErrorBoundary name="Portfolio" resetKeys={['/portfolio/2025']}>
                <ProblemChild shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByRole('alert')).not.toBeNull();

        rerender(
            <ErrorBoundary name="Portfolio" resetKeys={['/portfolio/2026']}>
                <ProblemChild shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.queryByRole('alert')).toBeNull();
        expect(screen.getByTestId('healthy-child').textContent).toBe('All systems nominal');
    });
});

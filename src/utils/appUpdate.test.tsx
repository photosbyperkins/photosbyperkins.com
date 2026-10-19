import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
    _resetAppUpdateState,
    canApplyNow,
    checkDataVersion,
    consumeUpdatedReason,
    isUpdatePending,
    markUpdatePending,
    registerBusy,
    unregisterBusy,
    useApplyPendingUpdate,
    UPDATED_STORAGE_KEY,
} from './appUpdate';

const mockIndexResponse = (dataVersion: string | undefined) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ years: ['2026'], dataVersion }),
    } as Response);

const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/portfolio/2026']}>{children}</MemoryRouter>
);

describe('appUpdate', () => {
    let reloadSpy: ReturnType<typeof vi.fn<() => void>>;

    beforeEach(() => {
        _resetAppUpdateState();
        sessionStorage.clear();
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        useAppStore.setState({
            lightbox: { ...useAppStore.getState().lightbox, isOpen: false },
            isBatchSelectMode: false,
            isAboutOpen: false,
            activeGear: null,
            iframeUrl: null,
        });
        reloadSpy = vi.fn<() => void>();
        vi.spyOn(window.location, 'reload').mockImplementation(reloadSpy);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    });

    describe('canApplyNow', () => {
        it('is true when nothing is open or busy', () => {
            expect(canApplyNow()).toBe(true);
        });

        it('is false while an activity is registered as busy', () => {
            registerBusy('story');
            expect(canApplyNow()).toBe(false);
            unregisterBusy('story');
            expect(canApplyNow()).toBe(true);
        });

        it('is false while the lightbox, batch mode or a modal is open', () => {
            useAppStore.setState({ lightbox: { ...useAppStore.getState().lightbox, isOpen: true } });
            expect(canApplyNow()).toBe(false);
            useAppStore.setState({ lightbox: { ...useAppStore.getState().lightbox, isOpen: false } });

            useAppStore.setState({ isBatchSelectMode: true });
            expect(canApplyNow()).toBe(false);
            useAppStore.setState({ isBatchSelectMode: false });

            useAppStore.setState({ iframeUrl: 'https://stats.wftda.com' });
            expect(canApplyNow()).toBe(false);
        });

        it('is false while offline', () => {
            Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
            expect(canApplyNow()).toBe(false);
        });
    });

    describe('useApplyPendingUpdate', () => {
        const renderWithNavigate = () =>
            renderHook(
                () => {
                    useApplyPendingUpdate();
                    return useNavigate();
                },
                { wrapper }
            );

        it('does nothing on navigation when no update is pending', () => {
            const { result } = renderWithNavigate();
            act(() => result.current('/portfolio/2025'));
            expect(reloadSpy).not.toHaveBeenCalled();
        });

        it('reloads on the next route change once an update is pending', () => {
            const { result } = renderWithNavigate();
            expect(reloadSpy).not.toHaveBeenCalled();

            markUpdatePending('data');
            act(() => result.current('/portfolio/2025'));

            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(sessionStorage.getItem(UPDATED_STORAGE_KEY)).toBe('data');
        });

        it('reloads when the tab is hidden', () => {
            renderWithNavigate();
            markUpdatePending('code');
            act(() => setVisibility('hidden'));
            expect(reloadSpy).toHaveBeenCalledTimes(1);
            expect(sessionStorage.getItem(UPDATED_STORAGE_KEY)).toBe('code');
        });

        it('waits while busy', () => {
            const { result } = renderWithNavigate();
            markUpdatePending('code');
            registerBusy('zip');

            act(() => setVisibility('hidden'));
            act(() => result.current('/portfolio/2025'));
            expect(reloadSpy).not.toHaveBeenCalled();

            unregisterBusy('zip');
            act(() => result.current('/portfolio/2024'));
            expect(reloadSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('markUpdatePending', () => {
        it('keeps "code" as the reason once set', () => {
            markUpdatePending('code');
            markUpdatePending('data');
            renderHook(() => useApplyPendingUpdate(), { wrapper });
            act(() => setVisibility('hidden'));
            expect(sessionStorage.getItem(UPDATED_STORAGE_KEY)).toBe('code');
        });
    });

    describe('checkDataVersion', () => {
        it('takes the first fetched version as the baseline', async () => {
            mockIndexResponse('aaa');
            await checkDataVersion();
            expect(isUpdatePending()).toBe(false);

            mockIndexResponse('aaa');
            await checkDataVersion();
            expect(isUpdatePending()).toBe(false);
        });

        it('marks an update pending when the version changes', async () => {
            mockIndexResponse('aaa');
            await checkDataVersion();
            mockIndexResponse('bbb');
            await checkDataVersion();
            expect(isUpdatePending()).toBe(true);
        });

        it('ignores responses without a dataVersion and fetch failures', async () => {
            mockIndexResponse(undefined);
            await checkDataVersion();
            await checkDataVersion(); // global fetch stub rejects
            mockIndexResponse('aaa');
            await checkDataVersion();
            expect(isUpdatePending()).toBe(false);
        });
    });

    describe('consumeUpdatedReason', () => {
        it('returns and clears the stored reason', () => {
            sessionStorage.setItem(UPDATED_STORAGE_KEY, 'data');
            expect(consumeUpdatedReason()).toBe('data');
            expect(consumeUpdatedReason()).toBeNull();
        });
    });
});

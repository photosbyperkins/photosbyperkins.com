import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { STORY_POPOVER_ATTR, useStoryPanelLayout } from '../../storyStudio/panelLayout';
import type { StoryThumbSectionData } from './thumbSections';

const THUMB_SELECTOR = '[data-thumb-key]';

/** Centre the selected thumb inside the filmstrip (thumbs are nested in sections, so measure with rects). */
function centerSelectedThumb(strip: HTMLDivElement | null, behavior: ScrollBehavior) {
    const selected = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !selected || typeof strip.scrollTo !== 'function') return;
    const stripRect = strip.getBoundingClientRect();
    const selRect = selected.getBoundingClientRect();
    const left = strip.scrollLeft + (selRect.left - stripRect.left) - (strip.clientWidth - selRect.width) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior });
}

/** Scroll the grid (its own scroller) so the selected thumb is visible, centred if it was out of view. */
function revealSelectedThumb(grid: HTMLDivElement | null) {
    const selected = grid?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!grid || !selected) return;
    const gridRect = grid.getBoundingClientRect();
    const selRect = selected.getBoundingClientRect();
    if (selRect.top >= gridRect.top && selRect.bottom <= gridRect.bottom) return;
    grid.scrollTop += selRect.top - gridRect.top - (grid.clientHeight - selRect.height) / 2;
}

/** Nearest thumb in the next (dir = 1) or previous (dir = -1) visual row of the grid. */
function verticalNeighbor(thumbs: HTMLElement[], current: HTMLElement, dir: 1 | -1): HTMLElement | undefined {
    const r = current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    let best: HTMLElement | undefined;
    let bestRow = Infinity;
    let bestDx = Infinity;
    for (const t of thumbs) {
        if (t === current) continue;
        const tr = t.getBoundingClientRect();
        const dy = dir > 0 ? tr.top - r.bottom : r.top - tr.bottom;
        if (dy < -r.height / 2) continue; // not below / above
        const dx = Math.abs(tr.left + tr.width / 2 - cx);
        if (dy < bestRow - 4 || (Math.abs(dy - bestRow) <= 4 && dx < bestDx)) {
            best = t;
            bestRow = dy;
            bestDx = dx;
        }
    }
    return best ?? thumbs[thumbs.indexOf(current) + dir];
}

interface StoryThumbBrowserProps<T> {
    id: string;
    ariaLabel: string;
    sections: StoryThumbSectionData<T>[];
    getKey: (item: T) => string;
    /** The selected item; it is scrolled into view and marked on its first appearance only. */
    selectedKey: string;
    /** Renders one `StoryThumb`. `isSelected` is true only for the first copy of the selected item. */
    renderThumb: (item: T, isSelected: boolean) => React.ReactNode;
    /** Mouse hover / keyboard focus preview; called with `null` when the pointer or focus leaves. */
    onPreview?: (key: string | null) => void;
    className?: string;
}

/**
 * Sectioned thumbnail browser shared by Frames and Filters.
 * - `grid` (desktop): the list scrolls on its own under the pinned options row. Sections stack as grids.
 * - `strip` (touch / narrow / short panels): one horizontal snap filmstrip. Section titles stick to the left
 *   edge and open a "Jump to" menu; a mouse wheel scrolls the strip sideways.
 * In both, the untitled "None" section is pinned as the first thumb of the first titled section (Recent, else
 * the first category) instead of sitting on its own. The list is a single Tab stop: arrow keys / Home / End
 * move between thumbs.
 */
export function StoryThumbBrowser<T>({
    id,
    ariaLabel,
    sections,
    getKey,
    selectedKey,
    renderThumb,
    onPreview,
    className = '',
}: StoryThumbBrowserProps<T>) {
    const { browse } = useStoryPanelLayout();
    const isGrid = browse === 'grid';
    const ref = useRef<HTMLDivElement>(null);
    const hasScrolledRef = useRef(false);

    // --- Scroll the selection into view on mount / layout switch, then glide in the strip ---
    useLayoutEffect(() => {
        hasScrolledRef.current = false;
        if (browse === 'strip') centerSelectedThumb(ref.current, 'auto');
        else revealSelectedThumb(ref.current);
        hasScrolledRef.current = true;
    }, [browse]);

    useEffect(() => {
        if (browse !== 'strip' || !hasScrolledRef.current) return;
        centerSelectedThumb(ref.current, 'smooth');
    }, [browse, selectedKey]);

    // --- Mouse wheel scrolls the filmstrip sideways ---
    useEffect(() => {
        const el = ref.current;
        if (!el || browse !== 'strip') return;
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
            if (el.scrollWidth <= el.clientWidth) return;
            el.scrollLeft += e.deltaY * (e.deltaMode === 1 ? 16 : 1);
            e.preventDefault();
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [browse]);

    // --- Roving tabindex: one Tab stop (the focused thumb, else the selection, else the first thumb) ---
    useLayoutEffect(() => {
        const root = ref.current;
        if (!root) return;
        const thumbs = Array.from(root.querySelectorAll<HTMLElement>(THUMB_SELECTOR));
        const current =
            thumbs.find((t) => t === document.activeElement) ??
            thumbs.find((t) => t.getAttribute('aria-pressed') === 'true') ??
            thumbs[0];
        thumbs.forEach((t) => {
            t.tabIndex = t === current ? 0 : -1;
        });
    });

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const root = ref.current;
        const current = (e.target as HTMLElement).closest<HTMLElement>(THUMB_SELECTOR);
        if (!root || !current) return;
        const thumbs = Array.from(root.querySelectorAll<HTMLElement>(THUMB_SELECTOR));
        const i = thumbs.indexOf(current);
        let next: HTMLElement | undefined;
        switch (e.key) {
            case 'ArrowRight':
                next = thumbs[i + 1];
                break;
            case 'ArrowLeft':
                next = thumbs[i - 1];
                break;
            case 'ArrowDown':
                next = isGrid ? verticalNeighbor(thumbs, current, 1) : thumbs[i + 1];
                break;
            case 'ArrowUp':
                next = isGrid ? verticalNeighbor(thumbs, current, -1) : thumbs[i - 1];
                break;
            case 'Home':
                next = thumbs[0];
                break;
            case 'End':
                next = thumbs[thumbs.length - 1];
                break;
            default:
                return;
        }
        e.preventDefault();
        if (!next) return;
        thumbs.forEach((t) => {
            t.tabIndex = t === next ? 0 : -1;
        });
        next.focus();
    };

    // --- Hover / keyboard-focus preview ---
    const onPreviewRef = useRef(onPreview);
    const previewKeyRef = useRef<string | null>(null);
    useEffect(() => {
        onPreviewRef.current = onPreview;
    });
    const emitPreview = useCallback((key: string | null) => {
        if (previewKeyRef.current === key) return;
        previewKeyRef.current = key;
        onPreviewRef.current?.(key);
    }, []);
    useEffect(
        () => () => {
            if (previewKeyRef.current !== null) onPreviewRef.current?.(null);
        },
        []
    );

    const handlePointerOver = (e: React.PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        const thumb = (e.target as Element).closest(THUMB_SELECTOR);
        // Between thumbs keep the current preview so it doesn't flicker back and forth
        if (thumb) emitPreview(thumb.getAttribute('data-thumb-key'));
    };

    const isFocusVisible = (el: HTMLElement) => {
        try {
            return el.matches(':focus-visible');
        } catch {
            return false;
        }
    };

    const handleFocus = (e: React.FocusEvent) => {
        const thumb = (e.target as HTMLElement).closest<HTMLElement>(THUMB_SELECTOR);
        // Keyboard focus previews; a mouse click's focus doesn't (hover already did)
        if (thumb && isFocusVisible(thumb)) emitPreview(thumb.getAttribute('data-thumb-key'));
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!ref.current?.contains(e.relatedTarget as Node | null)) emitPreview(null);
    };

    // --- "Jump to section" menu (filmstrip only) ---
    const titledSections = sections.filter((s) => s.title);
    const canJump = !isGrid && titledSections.length > 1;
    // Section whose title opened the menu (null = closed) and the menu's offset below the browser's top
    const [jumpFrom, setJumpFrom] = useState<{ section: string; top: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = `${id}-jump-menu`;
    const isMenuOpen = canJump && jumpFrom !== null;
    const openerSection = jumpFrom?.section;

    const findOpener = useCallback(
        (sectionId: string | undefined) =>
            sectionId ? ref.current?.querySelector<HTMLElement>(`[data-jump-section="${sectionId}"]`) : null,
        []
    );

    const toggleJumpMenu = (opener: HTMLButtonElement, sectionId: string) => {
        if (jumpFrom?.section === sectionId) {
            setJumpFrom(null);
            return;
        }
        const strip = ref.current;
        const top = (strip?.offsetTop ?? 0) + opener.offsetHeight + 6;
        setJumpFrom({ section: sectionId, top });
    };

    const jumpTo = (sectionId: string) => {
        const strip = ref.current;
        const sectionEl = strip?.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`);
        setJumpFrom(null);
        if (!strip || !sectionEl) return;
        const padLeft = parseFloat(getComputedStyle(strip).paddingLeft) || 0;
        strip.scrollTo?.({ left: Math.max(0, sectionEl.offsetLeft - padLeft), behavior: 'smooth' });
        sectionEl.querySelector<HTMLElement>(THUMB_SELECTOR)?.focus({ preventScroll: true });
    };

    useEffect(() => {
        if (!isMenuOpen) return;
        menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
        const handlePointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target) || findOpener(openerSection)?.contains(target)) return;
            setJumpFrom(null);
        };
        // Capture phase so Escape closes only the menu (not the sheet or the modal)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            e.stopImmediatePropagation();
            setJumpFrom(null);
            findOpener(openerSection)?.focus({ preventScroll: true });
        };
        document.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [isMenuOpen, openerSection, findOpener]);

    const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
        e.preventDefault();
        next?.focus();
    };

    // --- Render ---
    // Mark the selection only on its first appearance (e.g. in Recent, not again in its category)
    const selectedSectionId = sections.find((s) => s.items.some((item) => getKey(item) === selectedKey))?.id;
    const renderItems = (section: StoryThumbSectionData<T>) =>
        section.items.map((item) => {
            const key = getKey(item);
            const isSelected = key === selectedKey && section.id === selectedSectionId;
            return <React.Fragment key={key}>{renderThumb(item, isSelected)}</React.Fragment>;
        });

    // The untitled lead section ("None") is pinned as the first thumb of the next section (Recent, else the
    // first category), so every section title sits flush left. Counts still exclude it.
    const [first, ...rest] = sections;
    const mergeLead = first?.title === null && rest.length > 0;
    const blocks = mergeLead
        ? rest.map((section, i) => ({ section, lead: i === 0 ? first : undefined }))
        : sections.map((section) => ({ section, lead: undefined }));

    return (
        <>
            <div
                ref={ref}
                id={id}
                role="group"
                aria-label={ariaLabel}
                className={`story-thumbs story-thumbs--${browse} ${className}`}
                onKeyDown={handleKeyDown}
                onPointerOver={handlePointerOver}
                onPointerLeave={(e) => e.pointerType === 'mouse' && emitPreview(null)}
                onFocus={handleFocus}
                onBlur={handleBlur}
            >
                {blocks.map(({ section, lead }) => {
                    const { title } = section;
                    return (
                        <div
                            key={section.id}
                            data-section-id={section.id}
                            className={`story-thumb-section ${title ? '' : 'story-thumb-section--untitled'} ${
                                lead ? 'story-thumb-section--has-lead' : ''
                            }`}
                        >
                            <div className="story-thumb-section__header" aria-hidden={title ? undefined : true}>
                                {title &&
                                    (canJump ? (
                                        <button
                                            type="button"
                                            className="story-thumb-section__title story-thumb-section__jump"
                                            aria-haspopup="menu"
                                            aria-expanded={isMenuOpen && openerSection === section.id}
                                            aria-controls={menuId}
                                            aria-label={`${title}, jump to section`}
                                            data-jump-section={section.id}
                                            onClick={(e) => toggleJumpMenu(e.currentTarget, section.id)}
                                        >
                                            {title}
                                            <svg viewBox="0 0 10 10" aria-hidden="true">
                                                <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <span className="story-thumb-section__title">{title}</span>
                                    ))}
                                {title && (
                                    <span className="story-thumb-section__count" aria-hidden="true">
                                        {section.items.length}
                                    </span>
                                )}
                                {title && isGrid && section.description && (
                                    <span className="story-thumb-section__desc">{section.description}</span>
                                )}
                            </div>
                            <div
                                className="story-thumb-section__items"
                                role={title ? 'group' : undefined}
                                aria-label={title ?? undefined}
                            >
                                {lead && renderItems(lead)}
                                {renderItems(section)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isMenuOpen && (
                <div
                    ref={menuRef}
                    id={menuId}
                    className="story-thumb-jump"
                    role="menu"
                    aria-label="Jump to section"
                    style={{ top: jumpFrom?.top ?? 0, maxHeight: `calc(100% - ${(jumpFrom?.top ?? 0) + 4}px)` }}
                    onKeyDown={handleMenuKeyDown}
                    {...{ [STORY_POPOVER_ATTR]: '' }}
                >
                    {titledSections.map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            role="menuitem"
                            className="story-thumb-jump__item"
                            onClick={() => jumpTo(section.id)}
                        >
                            <span>{section.title}</span>
                            <span className="story-thumb-jump__count">{section.items.length}</span>
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

interface StoryThumbProps {
    /** Item id; used for keyboard navigation and hover preview. */
    thumbKey: string;
    label: string;
    isSelected: boolean;
    onSelect: () => void;
    title?: string;
    ariaLabel?: string;
    className?: string;
    /** 9:16 media content (image, SVG, placeholder). */
    children: React.ReactNode;
}

/** One selectable 9:16 thumbnail with its label. The selected thumb is highlighted and marked. */
export const StoryThumb: React.FC<StoryThumbProps> = ({
    thumbKey,
    label,
    isSelected,
    onSelect,
    title,
    ariaLabel,
    className = '',
    children,
}) => (
    <button
        type="button"
        className={`story-thumb ${isSelected ? 'story-thumb--selected' : ''} ${className}`}
        aria-pressed={isSelected}
        aria-label={ariaLabel}
        title={title}
        data-thumb-key={thumbKey}
        onClick={onSelect}
    >
        <span className="story-thumb__media" aria-hidden="true">
            {children}
        </span>
        <span className="story-thumb__label">{label}</span>
    </button>
);

export default StoryThumbBrowser;

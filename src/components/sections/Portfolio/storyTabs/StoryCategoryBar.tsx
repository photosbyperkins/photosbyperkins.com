import React, { useMemo, useRef } from 'react';
import { triggerHaptic } from '../../../../utils/haptics';

export interface StoryCategoryItem<T extends string> {
    id: T;
    label: string;
    vibe?: string;
    description?: string;
    group?: 'scope' | 'themes';
}

export interface StoryCategoryBarProps<T extends string> {
    categories: StoryCategoryItem<T>[];
    selectedCategory: T;
    onSelectCategory: (id: T) => void;
    categoryCounts: Record<string, number>;
    ariaLabel: string;
    controlsId?: string;
}

export function StoryCategoryBar<T extends string>({
    categories,
    selectedCategory,
    onSelectCategory,
    categoryCounts,
    ariaLabel,
    controlsId,
}: StoryCategoryBarProps<T>) {
    const tabRefs = useRef<Map<T, HTMLButtonElement | null>>(new Map());

    const { rows, flatCategories } = useMemo(() => {
        const scope = categories.filter((c) => c.group === 'scope' || c.id === 'all' || c.id === 'recent');
        const themes = categories.filter((c) => c.group !== 'scope' && c.id !== 'all' && c.id !== 'recent');
        return {
            rows: [
                { key: 'scope' as const, cats: scope },
                { key: 'themes' as const, cats: themes },
            ],
            flatCategories: [...scope, ...themes],
        };
    }, [categories]);

    const handleSelect = (id: T) => {
        triggerHaptic('tick');
        onSelectCategory(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentId: T) => {
        const currentIndex = flatCategories.findIndex((c) => c.id === currentId);
        if (currentIndex === -1) return;

        let nextIndex: number;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = (currentIndex + 1) % flatCategories.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = (currentIndex - 1 + flatCategories.length) % flatCategories.length;
                break;
            case 'Home':
                e.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                nextIndex = flatCategories.length - 1;
                break;
            default:
                return;
        }

        const nextCategory = flatCategories[nextIndex];
        if (nextCategory) {
            handleSelect(nextCategory.id);
            tabRefs.current.get(nextCategory.id)?.focus();
        }
    };

    return (
        <div
            className="story-export-modal__category-bar story-export-modal__category-bar--split"
            role="tablist"
            aria-label={ariaLabel}
        >
            {rows.map((row) => (
                <div
                    key={row.key}
                    role="presentation"
                    className={`story-export-modal__category-row story-export-modal__category-row--${row.key}`}
                >
                    {row.cats.map((cat) => {
                        const isCatActive = selectedCategory === cat.id;
                        const count = categoryCounts[cat.id] ?? 0;
                        const tooltip = cat.vibe || cat.description;

                        return (
                            <button
                                key={cat.id}
                                ref={(el) => {
                                    if (el) {
                                        tabRefs.current.set(cat.id, el);
                                    } else {
                                        tabRefs.current.delete(cat.id);
                                    }
                                }}
                                type="button"
                                role="tab"
                                id={`story-category-tab-${cat.id}`}
                                aria-selected={isCatActive}
                                aria-controls={controlsId}
                                tabIndex={isCatActive ? 0 : -1}
                                className={`story-export-modal__category-pill ${
                                    isCatActive ? 'story-export-modal__category-pill--active' : ''
                                }`}
                                onClick={() => handleSelect(cat.id)}
                                onKeyDown={(e) => handleKeyDown(e, cat.id)}
                                title={tooltip}
                            >
                                <span>{cat.label}</span>
                                <span className="story-export-modal__category-count">{count}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

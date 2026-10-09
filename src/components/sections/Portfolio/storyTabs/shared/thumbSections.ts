/** How many recently exported frames / filters the "Recent" section shows. */
export const STORY_RECENT_SECTION_LIMIT = 4;

export interface StoryThumbSectionData<T> {
    id: string;
    /** Section header; `null` for the untitled lead section (the "None" option). */
    title: string | null;
    /** Optional one-line tagline shown next to the title in the desktop grid. */
    description?: string;
    items: T[];
}

interface BuildSectionsOptions<T, C extends string> {
    items: T[];
    getId: (item: T) => string;
    getCategory: (item: T) => C | undefined;
    /** Theme categories in display order (scope entries such as "all" / "recent" are skipped by the caller). */
    categories: { id: C; label: string; description?: string }[];
    /** Most recent first. Unknown ids and "none" are ignored. */
    recentIds?: readonly string[];
    noneId?: string;
    recentLimit?: number;
}

/**
 * Splits a flat list into browser sections: the "None" option alone (untitled), "Recent" (when there is
 * any history), then one titled section per category in the given order. Empty categories are dropped.
 */
export function buildThumbSections<T, C extends string>({
    items,
    getId,
    getCategory,
    categories,
    recentIds = [],
    noneId = 'none',
    recentLimit = STORY_RECENT_SECTION_LIMIT,
}: BuildSectionsOptions<T, C>): StoryThumbSectionData<T>[] {
    const byId = new Map(items.map((item) => [getId(item), item]));
    const sections: StoryThumbSectionData<T>[] = [];

    const none = byId.get(noneId);
    if (none) sections.push({ id: 'none', title: null, items: [none] });

    const recent: T[] = [];
    for (const id of recentIds) {
        if (recent.length >= recentLimit) break;
        const item = id === noneId ? undefined : byId.get(id);
        if (item && !recent.includes(item)) recent.push(item);
    }
    if (recent.length) {
        sections.push({ id: 'recent', title: 'Recent', description: 'Your latest downloads', items: recent });
    }

    for (const cat of categories) {
        const catItems = items.filter((item) => getId(item) !== noneId && getCategory(item) === cat.id);
        if (catItems.length) {
            sections.push({ id: cat.id, title: cat.label, description: cat.description, items: catItems });
        }
    }
    return sections;
}

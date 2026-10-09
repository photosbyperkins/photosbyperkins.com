import { describe, it, expect } from 'vitest';
import { buildThumbSections, STORY_RECENT_SECTION_LIMIT } from './thumbSections';

type Item = { id: string; cat?: 'a' | 'b' | 'c' };

const ITEMS: Item[] = [
    { id: 'none' },
    { id: 'a1', cat: 'a' },
    { id: 'b1', cat: 'b' },
    { id: 'a2', cat: 'a' },
    { id: 'b2', cat: 'b' },
    { id: 'b3', cat: 'b' },
];

const CATEGORIES = [
    { id: 'b' as const, label: 'Bee' },
    { id: 'a' as const, label: 'Ay' },
    { id: 'c' as const, label: 'Sea' },
];

const build = (recentIds?: string[], recentLimit?: number) =>
    buildThumbSections({
        items: ITEMS,
        getId: (i) => i.id,
        getCategory: (i) => i.cat,
        categories: CATEGORIES,
        recentIds,
        recentLimit,
    });

const ids = (items: Item[]) => items.map((i) => i.id);

describe('buildThumbSections', () => {
    it('puts None first (untitled), then categories in the given order, dropping empty ones', () => {
        const sections = build();
        expect(sections.map((s) => [s.id, s.title])).toEqual([
            ['none', null],
            ['b', 'Bee'],
            ['a', 'Ay'],
        ]);
        expect(ids(sections[0].items)).toEqual(['none']);
        expect(ids(sections[1].items)).toEqual(['b1', 'b2', 'b3']);
        expect(ids(sections[2].items)).toEqual(['a1', 'a2']);
    });

    it('omits Recent when there is no history', () => {
        expect(build([]).some((s) => s.id === 'recent')).toBe(false);
        expect(build(['none', 'unknown']).some((s) => s.id === 'recent')).toBe(false);
    });

    it('adds Recent after None, newest first, skipping none/unknown/duplicate ids', () => {
        const sections = build(['b2', 'none', 'nope', 'a1', 'b2']);
        expect(sections[1].id).toBe('recent');
        expect(sections[1].title).toBe('Recent');
        expect(ids(sections[1].items)).toEqual(['b2', 'a1']);
        // Recent items still appear in their category
        expect(ids(sections.find((s) => s.id === 'b')!.items)).toContain('b2');
    });

    it('caps Recent at the limit', () => {
        const all = ['a1', 'b1', 'a2', 'b2', 'b3'];
        expect(build(all)[1].items).toHaveLength(STORY_RECENT_SECTION_LIMIT);
        expect(ids(build(all, 2)[1].items)).toEqual(['a1', 'b1']);
    });

    it('carries category taglines and describes Recent', () => {
        const sections = buildThumbSections({
            items: ITEMS,
            getId: (i) => i.id,
            getCategory: (i) => i.cat,
            categories: [
                { id: 'b' as const, label: 'Bee', description: 'Buzzy' },
                { id: 'a' as const, label: 'Ay' },
            ],
            recentIds: ['a1'],
        });
        expect(sections.map((s) => [s.id, s.description])).toEqual([
            ['none', undefined],
            ['recent', 'Your latest downloads'],
            ['b', 'Buzzy'],
            ['a', undefined],
        ]);
    });
});

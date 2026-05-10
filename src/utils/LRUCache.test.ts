import { describe, it, expect } from 'vitest';
import { LRUCache } from './LRUCache';

describe('LRUCache', () => {
    it('should store and retrieve values', () => {
        const cache = new LRUCache<string, number>(3);
        cache.set('a', 1);
        expect(cache.get('a')).toBe(1);
    });

    it('should evict the least recently used item when capacity is reached', () => {
        const cache = new LRUCache<string, number>(3);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        // Cache is full: a, b, c.
        // Access 'a' so 'b' becomes least recently used.
        cache.get('a');

        // Add 'd', which should evict 'b'
        cache.set('d', 4);

        expect(cache.get('a')).toBe(1); // 'a' was accessed, so it's kept
        expect(cache.get('b')).toBeUndefined(); // 'b' was evicted
        expect(cache.get('c')).toBe(3); // 'c' was kept
        expect(cache.get('d')).toBe(4); // 'd' was just added
    });

    it('should update value and mark as recently used if key already exists', () => {
        const cache = new LRUCache<string, number>(2);
        cache.set('a', 1);
        cache.set('b', 2);

        // Update 'a', so 'b' is LRU
        cache.set('a', 10);

        cache.set('c', 3); // Should evict 'b'

        expect(cache.get('a')).toBe(10);
        expect(cache.get('b')).toBeUndefined();
        expect(cache.get('c')).toBe(3);
    });

    it('should handle capacity of 1', () => {
        const cache = new LRUCache<string, number>(1);
        cache.set('a', 1);
        expect(cache.get('a')).toBe(1);

        cache.set('b', 2);
        expect(cache.get('a')).toBeUndefined();
        expect(cache.get('b')).toBe(2);
    });
});

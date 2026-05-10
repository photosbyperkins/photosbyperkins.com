export class LRUCache<K, V> {
    private max: number;
    private cache: Map<K, V>;

    constructor(max = 20) {
        this.max = max;
        this.cache = new Map();
    }

    get(key: K): V | undefined {
        const item = this.cache.get(key);
        if (item !== undefined) {
            this.cache.delete(key);
            this.cache.set(key, item);
        }
        return item;
    }

    set(key: K, val: V) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.max) {
            this.cache.delete(this.cache.keys().next().value as K);
        }
        this.cache.set(key, val);
    }
}

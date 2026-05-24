import { describe, it, expect, beforeEach } from 'vitest';
import { Collection, LimitedCollection } from './Collection.js';

describe('Collection', () => {
  let collection: Collection<string, number>;

  beforeEach(() => {
    collection = new Collection<string, number>();
    collection.set('a', 1);
    collection.set('b', 2);
    collection.set('c', 3);
  });

  describe('basic operations', () => {
    it('should get first value', () => {
      expect(collection.first()).toBe(1);
    });

    it('should get last value', () => {
      expect(collection.last()).toBe(3);
    });

    it('should filter values', () => {
      const filtered = collection.filter((v) => v > 1);
      expect(filtered.size).toBe(2);
      expect(filtered.has('b')).toBe(true);
      expect(filtered.has('c')).toBe(true);
    });

    it('should find values', () => {
      const found = collection.find((v) => v === 2);
      expect(found).toBe(2);
    });

    it('should map values', () => {
      const mapped = collection.map((v) => v * 2);
      expect(mapped).toEqual([2, 4, 6]);
    });

    it('should sort values', () => {
      const unsorted = new Collection<string, number>();
      unsorted.set('a', 3);
      unsorted.set('b', 1);
      unsorted.set('c', 2);

      const sorted = unsorted.sort((a, b) => a - b);
      expect(Array.from(sorted.values())).toEqual([1, 2, 3]);
    });

    it('should partition values', () => {
      const [even, odd] = collection.partition((v) => v % 2 === 0);
      expect(even.size).toBe(1);
      expect(odd.size).toBe(2);
      expect(even.get('b')).toBe(2);
    });

    it('should reduce values', () => {
      const sum = collection.reduce((acc, v) => acc + v, 0);
      expect(sum).toBe(6);
    });

    it('should convert to array', () => {
      const arr = collection.toArray();
      expect(arr).toHaveLength(3);
      expect(arr[0]).toEqual(['a', 1]);
    });
  });

  describe('random operations', () => {
    it('should return random value', () => {
      const random = collection.random();
      expect(random).toBeDefined();
      expect([1, 2, 3]).toContain(random);
    });

    it('should return random key', () => {
      const key = collection.randomKey();
      expect(key).toBeDefined();
      expect(['a', 'b', 'c']).toContain(key);
    });
  });

  describe('predicate methods', () => {
    it('should check some', () => {
      expect(collection.some((v) => v === 2)).toBe(true);
      expect(collection.some((v) => v === 10)).toBe(false);
    });

    it('should check every', () => {
      expect(collection.every((v) => v > 0)).toBe(true);
      expect(collection.every((v) => v > 1)).toBe(false);
    });
  });

  describe('has methods', () => {
    it('should check hasAll', () => {
      expect(collection.hasAll('a', 'b')).toBe(true);
      expect(collection.hasAll('a', 'z')).toBe(false);
    });

    it('should check hasAny', () => {
      expect(collection.hasAny('a', 'z')).toBe(true);
      expect(collection.hasAny('x', 'y')).toBe(false);
    });
  });

  describe('groupBy', () => {
    it('should group values', () => {
      const grouped = collection.groupBy((v) => (v % 2 === 0 ? 'even' : 'odd'));
      expect(grouped.get('even')?.size).toBe(1);
      expect(grouped.get('odd')?.size).toBe(2);
    });
  });

  describe('unique', () => {
    it('should return unique values', () => {
      const withDups = new Collection<string, number>();
      withDups.set('a', 1);
      withDups.set('b', 1);
      withDups.set('c', 2);

      const unique = withDups.unique();
      expect(unique.size).toBe(2);
    });
  });
});

describe('LimitedCollection', () => {
  it('should limit size', () => {
    const limited = new LimitedCollection<string, number>(3);
    limited.set('a', 1);
    limited.set('b', 2);
    limited.set('c', 3);
    limited.set('d', 4); // This should evict 'a'

    expect(limited.size).toBe(3);
    expect(limited.has('a')).toBe(false);
    expect(limited.has('d')).toBe(true);
  });

  it('should track access order', () => {
    const limited = new LimitedCollection<string, number>(3);
    limited.set('a', 1);
    limited.set('b', 2);
    limited.set('c', 3);

    // Access 'a' to make it most recently used
    limited.get('a');
    limited.set('d', 4); // Should evict 'b'

    expect(limited.has('b')).toBe(false);
    expect(limited.has('a')).toBe(true);
  });
});

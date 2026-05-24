/**
 * Enhanced Map implementation with utility methods inspired by discord.js
 * @module utils
 */

/**
 * A Map with additional utility methods for working with collections
 * @template K The type of keys in the collection
 * @template V The type of values in the collection
 */
export class Collection<K, V> extends Map<K, V> {
  /**
   * Get the first value in the collection
   */
  first(): V | undefined {
    return this.values().next().value;
  }

  /**
   * Get the first key in the collection
   */
  firstKey(): K | undefined {
    return this.keys().next().value;
  }

  /**
   * Get the last value in the collection
   */
  last(): V | undefined {
    const arr = Array.from(this.values());
    return arr[arr.length - 1];
  }

  /**
   * Get the last key in the collection
   */
  lastKey(): K | undefined {
    const arr = Array.from(this.keys());
    return arr[arr.length - 1];
  }

  /**
   * Get a random value from the collection
   */
  random(): V | undefined {
    const arr = Array.from(this.values());
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get a random key from the collection
   */
  randomKey(): K | undefined {
    const arr = Array.from(this.keys());
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get multiple random values
   */
  randomMany(count: number): V[] {
    const arr = Array.from(this.values());
    const results: V[] = [];
    for (let i = 0; i < Math.min(count, arr.length); i++) {
      const idx = Math.floor(Math.random() * arr.length);
      results.push(arr.splice(idx, 1)[0]!);
    }
    return results;
  }

  /**
   * Filter values and return a new Collection
   */
  filter(predicate: (value: V, key: K, collection: this) => boolean): Collection<K, V> {
    const results = new Collection<K, V>();
    for (const [key, val] of this) {
      if (predicate(val, key, this)) {
        results.set(key, val);
      }
    }
    return results;
  }

  /**
   * Find the first value matching the predicate
   */
  find(predicate: (value: V, key: K, collection: this) => boolean): V | undefined {
    for (const [key, val] of this) {
      if (predicate(val, key, this)) return val;
    }
    return undefined;
  }

  /**
   * Find the key for the first value matching the predicate
   */
  findKey(predicate: (value: V, key: K, collection: this) => boolean): K | undefined {
    for (const [key, val] of this) {
      if (predicate(val, key, this)) return key;
    }
    return undefined;
  }

  /**
   * Map values to a new array
   */
  map<T>(fn: (value: V, key: K, collection: this) => T): T[] {
    const results: T[] = [];
    for (const [key, val] of this) {
      results.push(fn(val, key, this));
    }
    return results;
  }

  /**
   * Check if any value matches the predicate
   */
  some(predicate: (value: V, key: K, collection: this) => boolean): boolean {
    for (const [key, val] of this) {
      if (predicate(val, key, this)) return true;
    }
    return false;
  }

  /**
   * Check if all values match the predicate
   */
  every(predicate: (value: V, key: K, collection: this) => boolean): boolean {
    for (const [key, val] of this) {
      if (!predicate(val, key, this)) return false;
    }
    return true;
  }

  /**
   * Partition values into two collections based on predicate
   */
  partition(predicate: (value: V, key: K, collection: this) => boolean): [Collection<K, V>, Collection<K, V>] {
    const matches = new Collection<K, V>();
    const nonMatches = new Collection<K, V>();

    for (const [key, val] of this) {
      if (predicate(val, key, this)) {
        matches.set(key, val);
      } else {
        nonMatches.set(key, val);
      }
    }

    return [matches, nonMatches];
  }

  /**
   * Sort values and return a new Collection
   */
  sort(
    compareFn?: (firstValue: V, secondValue: V, firstKey: K, secondKey: K) => number
  ): Collection<K, V> {
    const entries = Array.from(this.entries());
    entries.sort((a, b) => compareFn?.(a[1], b[1], a[0], b[0]) ?? 0);
    return new Collection(entries);
  }

  /**
   * Sort in place and return this
   */
  sortInPlace(
    compareFn?: (firstValue: V, secondValue: V, firstKey: K, secondKey: K) => number
  ): this {
    const entries = Array.from(this.entries());
    entries.sort((a, b) => compareFn?.(a[1], b[1], a[0], b[0]) ?? 0);
    this.clear();
    for (const [key, val] of entries) {
      this.set(key, val);
    }
    return this;
  }

  /**
   * Reduce values to a single value
   */
  reduce<T>(
    fn: (accumulator: T, value: V, key: K, collection: this) => T,
    initialValue: T
  ): T {
    let acc = initialValue;
    for (const [key, val] of this) {
      acc = fn(acc, val, key, this);
    }
    return acc;
  }

  /**
   * Execute a function on each value
   */
  each(fn: (value: V, key: K, collection: this) => void): this {
    this.forEach((val, key) => fn(val, key, this));
    return this;
  }

  /**
   * Get an array of values at specific keys
   */
  at(...keys: K[]): V[] {
    return keys.map((key) => this.get(key)).filter((v): v is V => v !== undefined);
  }

  /**
   * Check if collection has all keys
   */
  hasAll(...keys: K[]): boolean {
    return keys.every((key) => this.has(key));
  }

  /**
   * Check if collection has any of the keys
   */
  hasAny(...keys: K[]): boolean {
    return keys.some((key) => this.has(key));
  }

  /**
   * Create a new Collection with only unique values (by reference)
   */
  unique(): Collection<K, V> {
    const seen = new Set<V>();
    const result = new Collection<K, V>();
    for (const [key, val] of this) {
      if (!seen.has(val)) {
        seen.add(val);
        result.set(key, val);
      }
    }
    return result;
  }

  /**
   * Group values by a key function
   */
  groupBy<T>(fn: (value: V, key: K, collection: this) => T): Map<T, Collection<K, V>> {
    const groups = new Map<T, Collection<K, V>>();
    for (const [key, val] of this) {
      const groupKey = fn(val, key, this);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, new Collection<K, V>());
      }
      groups.get(groupKey)!.set(key, val);
    }
    return groups;
  }

  /**
   * Convert to array of [key, value] pairs
   */
  toArray(): [K, V][] {
    return Array.from(this.entries());
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, val] of this) {
      obj[String(key)] = typeof (val as { toJSON?: () => unknown }).toJSON === 'function'
        ? (val as { toJSON: () => unknown }).toJSON()
        : val;
    }
    return obj;
  }

  /**
   * Create a Collection from an array
   */
  static fromArray<K, V>(
    array: V[],
    keyFn: (value: V, index: number) => K
  ): Collection<K, V> {
    const collection = new Collection<K, V>();
    array.forEach((value, index) => {
      collection.set(keyFn(value, index), value);
    });
    return collection;
  }

  /**
   * Create a Collection from a record/object
   */
  static fromObject<V>(obj: Record<string, V>): Collection<string, V> {
    return new Collection(Object.entries(obj));
  }
}

/**
 * Limited-size collection that evicts oldest entries
 */
export class LimitedCollection<K, V> extends Collection<K, V> {
  private maxSize: number;
  private accessOrder: K[] = [];

  constructor(maxSize: number, entries?: Iterable<readonly [K, V]>) {
    super(entries);
    this.maxSize = maxSize;
    if (entries) {
      this.accessOrder = Array.from(this.keys());
    }
  }

  override set(key: K, value: V): this {
    // Remove key if exists to update order
    const existingIndex = this.accessOrder.indexOf(key);
    if (existingIndex > -1) {
      this.accessOrder.splice(existingIndex, 1);
    }

    // Add to end
    this.accessOrder.push(key);

    // Evict oldest if at capacity
    if (this.accessOrder.length > this.maxSize && !this.has(key)) {
      const oldest = this.accessOrder.shift();
      if (oldest !== undefined) {
        super.delete(oldest);
      }
    }

    return super.set(key, value);
  }

  override get(key: K): V | undefined {
    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
    return super.get(key);
  }

  override delete(key: K): boolean {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return super.delete(key);
  }

  override clear(): void {
    this.accessOrder = [];
    super.clear();
  }

  /**
   * Get oldest entries (LRU)
   */
  get oldest(): K[] {
    return [...this.accessOrder];
  }
}

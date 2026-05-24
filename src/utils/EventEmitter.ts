/**
 * Type-safe EventEmitter implementation
 * @module utils
 */

/** Event listener function type */
export type EventListener<T = unknown[]> = (...args: T extends unknown[] ? T : [T]) => void;

/** Event listener with once wrapper */
interface Listener<T> {
  fn: EventListener<T>;
  once: boolean;
}

/**
 * Type-safe EventEmitter for typed events
 * @template Events Event map type
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class EventEmitter<Events extends Record<PropertyKey, any[]> = Record<never, never[]>> {
  private events = new Map<keyof Events, Listener<unknown[]>[]>();

  /**
   * Subscribe to an event
   * @param event Event name
   * @param listener Event handler function
   */
  on<K extends keyof Events>(
    event: K,
    listener: EventListener<Events[K]>
  ): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push({
      fn: listener as EventListener<unknown[]>,
      once: false,
    });
    return this;
  }

  /**
   * Subscribe to an event for one emission only
   * @param event Event name
   * @param listener Event handler function
   */
  once<K extends keyof Events>(
    event: K,
    listener: EventListener<Events[K]>
  ): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push({
      fn: listener as EventListener<unknown[]>,
      once: true,
    });
    return this;
  }

  /**
   * Unsubscribe from an event
   * @param event Event name
   * @param listener Event handler function to remove
   */
  off<K extends keyof Events>(
    event: K,
    listener: EventListener<Events[K]>
  ): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const idx = listeners.findIndex((l) => l.fn === listener);
      if (idx > -1) {
        listeners.splice(idx, 1);
      }
    }
    return this;
  }

  /**
   * Emit an event
   * @param event Event name
   * @param args Arguments to pass to listeners
   */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): boolean {
    const listeners = this.events.get(event);
    if (!listeners || listeners.length === 0) return false;

    // Iterate backwards to allow removal during iteration
    for (let i = listeners.length - 1; i >= 0; i--) {
      const listener = listeners[i]!;
      if (listener.once) {
        listeners.splice(i, 1);
      }
      listener.fn(...args);
    }

    return true;
  }

  /**
   * Remove all listeners for an event, or all events
   * @param event Optional event name
   */
  removeAllListeners<K extends keyof Events>(event?: K): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Get the number of listeners for an event
   * @param event Event name
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.events.get(event)?.length ?? 0;
  }

  /**
   * Get all event names with listeners
   */
  eventNames(): (keyof Events)[] {
    return Array.from(this.events.keys());
  }

  /**
   * Check if an event has listeners
   * @param event Event name
   */
  hasListeners<K extends keyof Events>(event: K): boolean {
    return (this.events.get(event)?.length ?? 0) > 0;
  }

  /**
   * Wait for an event (returns a promise)
   * @param event Event name
   * @param timeout Optional timeout in milliseconds
   */
  waitFor<K extends keyof Events>(
    event: K,
    timeout?: number
  ): Promise<Events[K]> {
    return new Promise((resolve, reject) => {
      const handler = (...args: Events[K]) => {
        clearTimeout(timer);
        resolve(args);
      };

      let timer: ReturnType<typeof setTimeout> | undefined;
      if (timeout) {
        timer = setTimeout(() => {
          this.off(event, handler as EventListener<Events[K]>);
          reject(new Error(`Timeout waiting for event '${String(event)}'`));
        }, timeout);
      }

      this.once(event, handler as EventListener<Events[K]>);
    });
  }
}


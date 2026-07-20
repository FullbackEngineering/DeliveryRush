/**
 * Generic object pool to avoid GC churn for frequently spawned entities
 * (traffic cars, particles, floating text). Component-agnostic.
 */
export class ObjectPool<T> {
  private readonly free: T[] = [];
  private readonly factory: () => T;
  private readonly reset: (item: T) => void;

  constructor(factory: () => T, reset: (item: T) => void, prewarm = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < prewarm; i++) this.free.push(factory());
  }

  acquire(): T {
    const item = this.free.pop() ?? this.factory();
    return item;
  }

  release(item: T): void {
    this.reset(item);
    this.free.push(item);
  }

  get available(): number {
    return this.free.length;
  }
}

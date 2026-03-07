/** Generic circular buffer for rolling-window biometric data. */
export class CircularBuffer<T> {
  private buf: T[];
  private head = 0;
  private count = 0;

  constructor(private capacity: number) {
    this.buf = new Array<T>(capacity);
  }

  push(item: T): void {
    this.buf[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  toArray(): T[] {
    if (this.count < this.capacity) return this.buf.slice(0, this.count);
    return [...this.buf.slice(this.head), ...this.buf.slice(0, this.head)];
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  get length(): number {
    return this.count;
  }

  /** Compute median of a numeric field. Returns 0 if empty. */
  median(accessor: (t: T) => number): number {
    if (this.count === 0) return 0;
    const sorted = this.toArray().map(accessor).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /** Compute mean of a numeric field. Returns 0 if empty. */
  mean(accessor: (t: T) => number): number {
    if (this.count === 0) return 0;
    const arr = this.toArray();
    return arr.reduce((sum, t) => sum + accessor(t), 0) / arr.length;
  }
}

 *
    cache.delete(oldestKey!);


let evictionInterval: ReturnType<typeof setInterval> | undefined;

export function stopCacheEviction(): void {
  if (evictionInterval !== undefined) {
    clearInterval(evictionInterval);
    evictionInterval = undefined;
  }
}

if (typeof setInterval !== 'undefined') {
  evictionInterval = setInterval(() => {
}

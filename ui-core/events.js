/**
 * @param {{ scope?: { signal: AbortSignal }, signal?: AbortSignal }} [options]
 */
export function abortSignal(options = {}) {
  return options.scope?.signal ?? options.signal ?? undefined;
}

/**
 * @param {EventTarget} target
 * @param {string} type
 * @param {EventListenerOrEventListenerObject} listener
 * @param {AddEventListenerOptions & { scope?: { signal: AbortSignal }, signal?: AbortSignal }} [options]
 */
export function listen(target, type, listener, options = {}) {
  const signal = abortSignal(options);
  const eventOptions = { ...options };
  delete eventOptions.scope;
  delete eventOptions.signal;
  target.addEventListener(type, listener, signal ? { ...eventOptions, signal } : eventOptions);
  return () => {
    target.removeEventListener(type, listener, eventOptions);
  };
}

/**
 * @param {{ scope?: { signal: AbortSignal }, signal?: AbortSignal }} options
 * @param {() => void} fn
 */
export function onAbort(options, fn) {
  const signal = abortSignal(options);
  if (!signal) {
    return () => {};
  }
  if (signal.aborted) {
    fn();
    return () => {};
  }
  const listener = () => {
    fn();
  };
  signal.addEventListener("abort", listener, { once: true });
  return () => {
    signal.removeEventListener("abort", listener);
  };
}

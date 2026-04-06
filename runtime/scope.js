/**
 * @typedef {{
 *   signal: AbortSignal,
 *   aborted: boolean,
 *   abort(reason?: unknown): void,
 *   child(): Scope,
 *   onCleanup(fn: () => void): () => void,
 *   listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions): () => void,
 *   timeout(ms: number, fn: () => void): () => void,
 *   interval(ms: number, fn: () => void): () => void,
 *   raf(fn: FrameRequestCallback): () => void,
 *   observeResize(target: Element, fn: ResizeObserverCallback): () => void,
 *   observeIntersection(target: Element, fn: IntersectionObserverCallback, options?: IntersectionObserverInit): () => void,
 *   task<T>(run: (signal: AbortSignal, scope: Scope) => Promise<T> | T): { scope: Scope, promise: Promise<T>, cancel: (reason?: unknown) => void },
 *   fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>,
 *   fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T>,
 * }} Scope
 */

/**
 * @param {Scope | null} [parent]
 * @returns {Scope}
 */
export function scope(parent = null) {
  const controller = new AbortController();
  const cleanups = new Set();
  /** @type {Scope} */
  let api;

  /** @type {(fn: () => void) => () => void} */
  const addCleanup = (fn) => {
    if (controller.signal.aborted) {
      fn();
      return () => {};
    }
    cleanups.add(fn);
    return () => {
      cleanups.delete(fn);
    };
  };

  const runCleanups = () => {
    const fns = Array.from(cleanups).reverse();
    cleanups.clear();
    for (const fn of fns) {
      try {
        fn();
      } catch (error) {
        console.error("scope cleanup failed", error);
      }
    }
  };

  controller.signal.addEventListener("abort", runCleanups, { once: true });

  if (parent !== null) {
    if (parent.signal.aborted) {
      controller.abort(parent.signal.reason);
    } else {
      const forwardAbort = () => {
        api.abort(parent.signal.reason);
      };
      parent.signal.addEventListener("abort", forwardAbort, { once: true });
      addCleanup(() => {
        parent.signal.removeEventListener("abort", forwardAbort);
      });
    }
  }

  api = {
    get signal() {
      return controller.signal;
    },

    get aborted() {
      return controller.signal.aborted;
    },

    abort(reason) {
      if (controller.signal.aborted) {
        return;
      }
      controller.abort(reason);
    },

    child() {
      return scope(api);
    },

    onCleanup(fn) {
      return addCleanup(fn);
    },

    listen(target, type, listener, options = {}) {
      if ("signal" in options) {
        throw new Error("scope.listen() manages the signal itself");
      }
      target.addEventListener(type, listener, { ...options, signal: controller.signal });
      return () => {
        target.removeEventListener(type, listener, options);
      };
    },

    timeout(ms, fn) {
      const id = window.setTimeout(() => {
        stop();
        fn();
      }, ms);
      const stop = addCleanup(() => {
        window.clearTimeout(id);
      });
      return stop;
    },

    interval(ms, fn) {
      const id = window.setInterval(fn, ms);
      return addCleanup(() => {
        window.clearInterval(id);
      });
    },

    raf(fn) {
      const id = window.requestAnimationFrame((time) => {
        stop();
        fn(time);
      });
      const stop = addCleanup(() => {
        window.cancelAnimationFrame(id);
      });
      return stop;
    },

    observeResize(target, fn) {
      const observer = new ResizeObserver((entries, current) => {
        if (controller.signal.aborted) {
          return;
        }
        fn(entries, current);
      });
      observer.observe(target);
      return addCleanup(() => {
        observer.disconnect();
      });
    },

    observeIntersection(target, fn, options = {}) {
      const observer = new IntersectionObserver((entries, current) => {
        if (controller.signal.aborted) {
          return;
        }
        fn(entries, current);
      }, options);
      observer.observe(target);
      return addCleanup(() => {
        observer.disconnect();
      });
    },

    task(run) {
      const child = api.child();
      const promise = Promise.resolve().then(() => run(child.signal, child)).finally(() => {
        child.abort();
      });
      return {
        scope: child,
        promise,
        cancel(reason) {
          child.abort(reason);
        },
      };
    },

    fetch(input, init = {}) {
      if (init.signal !== undefined) {
        throw new Error("scope.fetch() manages the signal itself");
      }
      return window.fetch(input, { ...init, signal: controller.signal });
    },

    async fetchJson(input, init = {}) {
      const response = await api.fetch(input, init);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
  };

  return api;
}

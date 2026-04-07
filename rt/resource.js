import { computed, signal } from "./signal.js";

/**
 * @template T
 * @param {import("./scope.js").Scope} owner
 * @param {(signal: AbortSignal, scope: import("./scope.js").Scope) => Promise<T> | T} load
 * @param {{ immediate?: boolean, initialValue?: T | null }} [options]
 */
export function resource(owner, load, options = {}) {
  if (!owner) {
    throw new Error("resource() requires a scope");
  }

  const state = signal({
    status: "idle",
    value: options.initialValue ?? null,
    error: null,
  });

  /** @type {import("./scope.js").Scope | null} */
  let active = null;
  let token = 0;

  const abort = (reason) => {
    if (active === null) {
      return;
    }
    const current = active;
    active = null;
    current.abort(reason);
  };

  const reload = async () => {
    abort();

    const requestScope = owner.child();
    active = requestScope;
    const currentToken = ++token;
    const previous = state.peek().value;

    state.set({
      status: "loading",
      value: previous,
      error: null,
    });

    try {
      const value = await load(requestScope.signal, requestScope);
      if (requestScope.signal.aborted || currentToken !== token) {
        return null;
      }
      state.set({
        status: "ready",
        value,
        error: null,
      });
      return value;
    } catch (error) {
      if (requestScope.signal.aborted || currentToken !== token) {
        return null;
      }
      state.set({
        status: "error",
        value: previous,
        error,
      });
      throw error;
    } finally {
      if (active === requestScope) {
        active = null;
      }
      requestScope.abort();
    }
  };

  owner.onCleanup(() => {
    abort();
  });

  if (options.immediate !== false) {
    void reload();
  }

  return {
    abort,
    reload,
    state,
    value: computed(() => state().value),
    error: computed(() => state().error),
    loading: computed(() => state().status === "loading"),
    ready: computed(() => state().status === "ready"),
  };
}

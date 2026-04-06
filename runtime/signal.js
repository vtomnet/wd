/** @typedef {{ subscribers: Set<Computation> }} Source */

/**
 * @typedef {{
 *   kind: "effect" | "computed",
 *   fn: Function,
 *   deps: Set<Source>,
 *   subscribers: Set<Computation>,
 *   stale: boolean,
 *   queued: boolean,
 *   active: boolean,
 *   cleanup: (() => void) | null,
 *   value: unknown,
 * }} Computation
 */

/** @type {Computation | null} */
let currentComputation = null;
let batchDepth = 0;
/** @type {Set<Computation>} */
const pendingEffects = new Set();

/**
 * @param {Source} source
 */
function track(source) {
  if (currentComputation === null) {
    return;
  }
  source.subscribers.add(currentComputation);
  currentComputation.deps.add(source);
}

/**
 * @param {Computation} computation
 */
function clearDeps(computation) {
  for (const dep of computation.deps) {
    dep.subscribers.delete(computation);
  }
  computation.deps.clear();
}

/**
 * @param {Computation} computation
 */
function runCleanup(computation) {
  if (computation.cleanup === null) {
    return;
  }
  const fn = computation.cleanup;
  computation.cleanup = null;
  fn();
}

/**
 * @param {Computation} computation
 */
function runComputed(computation) {
  if (!computation.active) {
    return;
  }
  clearDeps(computation);
  const previous = currentComputation;
  currentComputation = computation;
  try {
    computation.value = computation.fn();
    computation.stale = false;
  } finally {
    currentComputation = previous;
  }
}

/**
 * @param {Computation} computation
 */
function runEffect(computation) {
  if (!computation.active) {
    return;
  }
  computation.queued = false;
  clearDeps(computation);
  runCleanup(computation);
  const previous = currentComputation;
  currentComputation = computation;
  try {
    const cleanup = computation.fn();
    computation.cleanup = typeof cleanup === "function" ? cleanup : null;
    computation.stale = false;
  } finally {
    currentComputation = previous;
  }
}

function flushPendingEffects() {
  while (pendingEffects.size > 0) {
    const batch = Array.from(pendingEffects);
    pendingEffects.clear();
    for (const computation of batch) {
      runEffect(computation);
    }
  }
}

/**
 * @param {Computation} computation
 */
function schedule(computation) {
  if (!computation.active) {
    return;
  }

  if (computation.kind === "computed") {
    if (computation.stale) {
      return;
    }
    computation.stale = true;
    const subscribers = Array.from(computation.subscribers);
    for (const subscriber of subscribers) {
      schedule(subscriber);
    }
    return;
  }

  if (computation.queued) {
    return;
  }
  computation.queued = true;
  computation.stale = true;
  pendingEffects.add(computation);
  if (batchDepth === 0) {
    flushPendingEffects();
  }
}

/**
 * @template T
 * @param {T} initialValue
 */
export function signal(initialValue) {
  let value = initialValue;
  /** @type {Source} */
  const source = {
    subscribers: new Set(),
  };

  const read = () => {
    track(source);
    return value;
  };

  read.set = (nextValue) => {
    if (Object.is(value, nextValue)) {
      return value;
    }
    value = nextValue;
    const subscribers = Array.from(source.subscribers);
    for (const subscriber of subscribers) {
      schedule(subscriber);
    }
    return value;
  };

  read.update = (fn) => {
    return read.set(fn(value));
  };

  read.peek = () => value;

  read.subscribe = (listener) => {
    const stop = effect(() => listener(read()));
    return stop;
  };

  return read;
}

/**
 * @template T
 * @param {() => T} fn
 */
export function computed(fn) {
  /** @type {Computation} */
  const computation = {
    kind: "computed",
    fn,
    deps: new Set(),
    subscribers: new Set(),
    stale: true,
    queued: false,
    active: true,
    cleanup: null,
    value: undefined,
  };

  const read = () => {
    if (computation.stale) {
      runComputed(computation);
    }
    track(computation);
    return /** @type {T} */ (computation.value);
  };

  read.peek = () => {
    if (computation.stale) {
      runComputed(computation);
    }
    return /** @type {T} */ (computation.value);
  };

  return read;
}

/**
 * @param {() => void | (() => void)} fn
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function effect(fn, options = {}) {
  /** @type {Computation} */
  const computation = {
    kind: "effect",
    fn,
    deps: new Set(),
    subscribers: new Set(),
    stale: true,
    queued: false,
    active: true,
    cleanup: null,
    value: undefined,
  };

  const stop = () => {
    if (!computation.active) {
      return;
    }
    computation.active = false;
    computation.queued = false;
    pendingEffects.delete(computation);
    clearDeps(computation);
    runCleanup(computation);
  };

  runEffect(computation);

  if (options.scope) {
    options.scope.onCleanup(stop);
  }

  return stop;
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function batch(fn) {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) {
      flushPendingEffects();
    }
  }
}

/**
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untrack(fn) {
  const previous = currentComputation;
  currentComputation = null;
  try {
    return fn();
  } finally {
    currentComputation = previous;
  }
}

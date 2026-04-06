/** @typedef {{ cancelled: boolean, fn: FrameRequestCallback }} Job */

/** @type {Job[]} */
const readQueue = [];
/** @type {Job[]} */
const writeQueue = [];
let rafId = 0;
let currentPhase = "idle";

function ensureFrame() {
  if (rafId !== 0) {
    return;
  }
  rafId = window.requestAnimationFrame(flush);
}

/**
 * @param {Job[]} queue
 * @param {DOMHighResTimeStamp} time
 */
function drain(queue, time) {
  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    for (const job of batch) {
      if (job.cancelled) {
        continue;
      }
      job.fn(time);
    }
  }
}

/**
 * @param {DOMHighResTimeStamp} time
 */
function flush(time) {
  rafId = 0;

  currentPhase = "read";
  drain(readQueue, time);

  currentPhase = "write";
  drain(writeQueue, time);

  currentPhase = "idle";

  if (readQueue.length > 0 || writeQueue.length > 0) {
    ensureFrame();
  }
}

/**
 * @param {Job[]} queue
 * @param {FrameRequestCallback} fn
 */
function schedule(queue, fn) {
  const job = {
    cancelled: false,
    fn,
  };
  queue.push(job);
  ensureFrame();
  return () => {
    job.cancelled = true;
  };
}

/**
 * @param {FrameRequestCallback} fn
 */
export function read(fn) {
  return schedule(readQueue, fn);
}

/**
 * @param {FrameRequestCallback} fn
 */
export function write(fn) {
  return schedule(writeQueue, fn);
}

export function phase() {
  return currentPhase;
}

export function nextFrame() {
  return new Promise((resolve) => {
    read((time) => {
      resolve(time);
    });
  });
}

export const measure = {
  /**
   * @param {Element} node
   */
  rect(node) {
    return node.getBoundingClientRect();
  },

  /**
   * @param {Element} node
   */
  size(node) {
    const { width, height } = node.getBoundingClientRect();
    return { width, height };
  },

  viewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  },

  /**
   * @param {Element | Window} [target]
   */
  scroll(target = window) {
    if (target === window) {
      return {
        x: window.scrollX,
        y: window.scrollY,
      };
    }
    return {
      x: target.scrollLeft,
      y: target.scrollTop,
    };
  },
};

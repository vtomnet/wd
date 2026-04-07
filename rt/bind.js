import { effect } from "./signal.js";

const SAFE_HTML = Symbol("safe-html");

/**
 * @param {unknown} value
 * @returns {() => unknown}
 */
function getter(value) {
  return typeof value === "function" ? value : () => value;
}

/**
 * @param {(() => void)} stop
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} options
 */
function attach(stop, options) {
  if (options.scope) {
    options.scope.onCleanup(stop);
  }
  return stop;
}

/**
 * @param {string} html
 */
export function safeHtml(html) {
  return {
    [SAFE_HTML]: true,
    html: String(html),
  };
}

/**
 * @param {unknown} value
 */
function assertSafeHtml(value) {
  if (!value || typeof value !== "object" || value[SAFE_HTML] !== true) {
    throw new Error("bind.html() only accepts values created by safeHtml()");
  }
  return value.html;
}

/**
 * @param {Node} node
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function text(node, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    const next = read();
    node.textContent = next == null ? "" : String(next);
  }), options);
}

/**
 * @param {Element} node
 * @param {string} name
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function prop(node, name, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    node[name] = read();
  }), options);
}

/**
 * @param {Element} node
 * @param {string} name
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function attr(node, name, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    const next = read();
    if (next == null || next === false) {
      node.removeAttribute(name);
      return;
    }
    node.setAttribute(name, next === true ? "" : String(next));
  }), options);
}

/**
 * @param {Element} node
 * @param {string} name
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function classToggle(node, name, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    node.classList.toggle(name, Boolean(read()));
  }), options);
}

/**
 * @param {HTMLElement | SVGElement} node
 * @param {string} name
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function style(node, name, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    const next = read();
    if (next == null || next === "") {
      node.style.removeProperty(name);
      return;
    }
    node.style.setProperty(name, String(next));
  }), options);
}

/**
 * @param {HTMLElement} node
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function show(node, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    node.hidden = !Boolean(read());
  }), options);
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} node
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function value(node, valueSource, options = {}) {
  const read = getter(valueSource);
  return attach(effect(() => {
    const next = read();
    const text = next == null ? "" : String(next);
    if (node.value !== text) {
      node.value = text;
    }
  }), options);
}

/**
 * @param {HTMLInputElement} node
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function checked(node, valueSource, options = {}) {
  const read = getter(valueSource);
  return attach(effect(() => {
    node.checked = Boolean(read());
  }), options);
}

/**
 * @param {Element} node
 * @param {unknown} value
 * @param {{ scope?: { onCleanup(fn: () => void): void } }} [options]
 */
export function html(node, value, options = {}) {
  const read = getter(value);
  return attach(effect(() => {
    const next = read();
    node.innerHTML = next == null ? "" : assertSafeHtml(next);
  }), options);
}

/**
 * @param {EventTarget} node
 * @param {string} type
 * @param {EventListenerOrEventListenerObject} listener
 * @param {AddEventListenerOptions & { scope: { listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions): () => void } }} options
 */
export function on(node, type, listener, options) {
  if (!options?.scope) {
    throw new Error("bind.on() requires a scope");
  }
  const { scope, ...eventOptions } = options;
  return scope.listen(node, type, listener, eventOptions);
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} node
 * @param {{ set(value: unknown): unknown } & (() => unknown)} state
 * @param {{ scope: { listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions): () => void, onCleanup(fn: () => void): void }, event?: string, parse?: (event: Event) => unknown }} options
 */
export function input(node, state, options) {
  const eventName = options.event ?? "input";
  const parse = options.parse ?? ((event) => /** @type {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} */ (event.currentTarget).value);
  value(node, state, options);
  return on(node, eventName, (event) => {
    state.set(parse(event));
  }, options);
}

/**
 * @param {HTMLInputElement} node
 * @param {{ set(value: boolean): unknown } & (() => unknown)} state
 * @param {{ scope: { listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions): () => void, onCleanup(fn: () => void): void }, event?: string }} options
 */
export function checkbox(node, state, options) {
  const eventName = options.event ?? "change";
  checked(node, state, options);
  return on(node, eventName, (event) => {
    const target = /** @type {HTMLInputElement} */ (event.currentTarget);
    state.set(target.checked);
  }, options);
}

export const bind = {
  attr,
  checked,
  checkbox,
  classToggle,
  html,
  input,
  on,
  prop,
  show,
  style,
  text,
  value,
};

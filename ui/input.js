import { classes } from "./dom.js";

/**
 * @param {{
 *   type?: string,
 *   name?: string,
 *   placeholder?: string,
 *   autocomplete?: string,
 *   value?: string,
 *   className?: string,
 * }} [options]
 */
export function input(options = {}) {
  const root = document.createElement("input");
  root.className = classes("ui-input", options.className);
  root.type = options.type ?? "text";
  root.dataset.slot = "input";
  if (options.name) {
    root.name = options.name;
  }
  if (options.placeholder) {
    root.placeholder = options.placeholder;
  }
  if (options.autocomplete) {
    root.autocomplete = options.autocomplete;
  }
  if (options.value !== undefined) {
    root.value = options.value;
  }
  return root;
}

/**
 * @param {{
 *   name?: string,
 *   placeholder?: string,
 *   value?: string,
 *   rows?: number,
 *   className?: string,
 * }} [options]
 */
export function textarea(options = {}) {
  const root = document.createElement("textarea");
  root.className = classes("ui-textarea", options.className);
  root.rows = options.rows ?? 4;
  root.dataset.slot = "textarea";
  if (options.name) {
    root.name = options.name;
  }
  if (options.placeholder) {
    root.placeholder = options.placeholder;
  }
  if (options.value !== undefined) {
    root.value = options.value;
  }
  return root;
}

/**
 * @param {{
 *   name?: string,
 *   className?: string,
 *   options?: Array<{ value: string, label: string }>,
 * }} [config]
 */
export function select(config = {}) {
  const root = document.createElement("select");
  root.className = classes("ui-select", config.className);
  root.dataset.slot = "select";
  if (config.name) {
    root.name = config.name;
  }
  for (const option of config.options ?? []) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    root.append(node);
  }
  return root;
}

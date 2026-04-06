import { classes } from "./dom.js";

/**
 * @param {{
 *   name?: string,
 *   checked?: boolean,
 *   className?: string,
 *   ariaLabel?: string,
 * }} [options]
 */
export function checkbox(options = {}) {
  const root = document.createElement("input");
  root.type = "checkbox";
  root.className = classes("ui-checkbox", options.className);
  root.checked = options.checked ?? false;
  root.dataset.slot = "checkbox";
  if (options.name) {
    root.name = options.name;
  }
  if (options.ariaLabel) {
    root.setAttribute("aria-label", options.ariaLabel);
  }
  return root;
}

import { classes } from "./dom.js";

/**
 * @param {{
 *   label?: string,
 *   variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link",
 *   className?: string,
 *   start?: Node | null,
 *   end?: Node | null,
 * }} [options]
 */
export function badge(options = {}) {
  const variant = options.variant ?? "secondary";
  const root = document.createElement("span");
  root.className = classes("ui-badge", `ui-badge--${variant}`, options.className);
  root.dataset.slot = "badge";
  root.dataset.variant = variant;
  if (options.start) {
    root.append(options.start);
  }
  if (options.label) {
    root.append(document.createTextNode(options.label));
  }
  if (options.end) {
    root.append(options.end);
  }
  return root;
}

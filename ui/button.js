import { classes } from "./dom.js";

/**
 * @param {{
 *   label?: string,
 *   type?: "button" | "submit" | "reset",
 *   variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link",
 *   size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg" | "md",
 *   disabled?: boolean,
 *   className?: string,
 *   ariaLabel?: string,
 *   start?: Node | null,
 *   end?: Node | null,
 * }} [options]
 */
export function button(options = {}) {
  const root = document.createElement("button");
  const size = options.size === "md" || options.size == null ? "default" : options.size;

  root.type = options.type ?? "button";
  root.className = classes(
    "ui-button",
    `ui-button--variant-${options.variant ?? "default"}`,
    `ui-button--size-${size}`,
    options.className,
  );
  root.disabled = options.disabled ?? false;
  root.dataset.slot = "button";
  root.dataset.variant = options.variant ?? "default";
  root.dataset.size = size;

  if (options.ariaLabel) {
    root.setAttribute("aria-label", options.ariaLabel);
  }
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

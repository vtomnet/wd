import { classes } from "./dom.js";

/**
 * @param {{ orientation?: "horizontal" | "vertical", className?: string }} [options]
 */
export function separator(options = {}) {
  const orientation = options.orientation ?? "horizontal";
  const root = document.createElement("div");
  root.className = classes("ui-separator", `ui-separator--${orientation}`, options.className);
  root.dataset.slot = "separator";
  root.dataset.orientation = orientation;
  root.setAttribute("role", "separator");
  if (orientation === "vertical") {
    root.setAttribute("aria-orientation", "vertical");
  }
  return root;
}

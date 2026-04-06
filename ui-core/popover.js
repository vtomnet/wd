import { listen } from "./events.js";

/**
 * @param {HTMLElement} panel
 * @param {{
 *   trigger?: HTMLElement | null,
 *   closeButtons?: Iterable<HTMLElement>,
 *   onOpenChange?: (open: boolean) => void,
 *   scope?: { signal: AbortSignal },
 *   signal?: AbortSignal,
 * }} [options]
 */
export function createPopoverController(panel, options = {}) {
  if (!(panel instanceof HTMLElement)) {
    throw new Error("createPopoverController() requires an HTMLElement");
  }
  if (!("showPopover" in panel)) {
    throw new Error("Popover API is required");
  }

  panel.popover = "manual";
  panel.dataset.state = panel.matches(":popover-open") ? "open" : "closed";

  const controller = {
    open() {
      if (panel.matches(":popover-open")) {
        return;
      }
      panel.showPopover();
    },

    close() {
      if (!panel.matches(":popover-open")) {
        return;
      }
      panel.hidePopover();
    },

    toggle() {
      if (panel.matches(":popover-open")) {
        controller.close();
        return;
      }
      controller.open();
    },
  };

  if (options.trigger) {
    listen(options.trigger, "click", () => {
      controller.toggle();
    }, options);
  }

  for (const button of options.closeButtons ?? []) {
    listen(button, "click", () => {
      controller.close();
    }, options);
  }

  listen(panel, "toggle", () => {
    const open = panel.matches(":popover-open");
    panel.dataset.state = open ? "open" : "closed";
    options.onOpenChange?.(open);
  }, options);

  return controller;
}

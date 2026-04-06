import { listen } from "./events.js";

/**
 * @param {HTMLDialogElement} dialog
 * @param {{
 *   trigger?: HTMLElement | null,
 *   closeButtons?: Iterable<HTMLElement>,
 *   closeOnBackdrop?: boolean,
 *   restoreFocus?: boolean,
 *   onOpenChange?: (open: boolean) => void,
 *   scope?: { signal: AbortSignal },
 *   signal?: AbortSignal,
 * }} [options]
 */
export function createDialogController(dialog, options = {}) {
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error("createDialogController() requires an HTMLDialogElement");
  }

  const closeOnBackdrop = options.closeOnBackdrop ?? true;
  const restoreFocus = options.restoreFocus ?? true;
  const closeButtons = Array.from(options.closeButtons ?? []);
  /** @type {HTMLElement | null} */
  let returnFocusTo = null;

  const controller = {
    open() {
      if (dialog.open) {
        return;
      }
      const active = document.activeElement;
      returnFocusTo = active instanceof HTMLElement ? active : options.trigger ?? null;
      dialog.showModal();
      dialog.dataset.state = "open";
      options.onOpenChange?.(true);
    },

    close(returnValue = "") {
      if (!dialog.open) {
        return;
      }
      dialog.close(returnValue);
    },

    toggle() {
      if (dialog.open) {
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

  for (const button of closeButtons) {
    listen(button, "click", () => {
      controller.close();
    }, options);
  }

  listen(dialog, "close", () => {
    dialog.dataset.state = "closed";
    options.onOpenChange?.(false);
    if (restoreFocus && returnFocusTo && returnFocusTo.isConnected) {
      returnFocusTo.focus();
    }
  }, options);

  if (closeOnBackdrop) {
    listen(dialog, "click", (event) => {
      const rect = dialog.getBoundingClientRect();
      const inside = rect.top <= event.clientY
        && event.clientY <= rect.top + rect.height
        && rect.left <= event.clientX
        && event.clientX <= rect.left + rect.width;
      if (!inside) {
        controller.close();
      }
    }, options);
  }

  return controller;
}

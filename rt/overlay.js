import { read, write } from "./frame.js";

/**
 * @param {import("./scope.js").Scope} scope
 * @param {HTMLElement} overlay
 * @param {Element} anchor
 * @param {{
 *   placement?: "top" | "top-start" | "top-end" | "bottom" | "bottom-start" | "bottom-end" | "left" | "left-start" | "left-end" | "right" | "right-start" | "right-end",
 *   offset?: number,
 *   inset?: number,
 *   strategy?: "fixed" | "absolute",
 *   matchWidth?: boolean,
 * }} [options]
 */
export function anchorOverlay(scope, overlay, anchor, options = {}) {
  const placement = options.placement ?? "bottom-start";
  const offset = options.offset ?? 8;
  const inset = options.inset ?? 8;
  const strategy = options.strategy ?? "fixed";
  const matchWidth = options.matchWidth ?? false;

  overlay.style.position = strategy;
  overlay.style.visibility = "hidden";

  const update = () => {
    read(() => {
      if (!anchor.isConnected || !overlay.isConnected) {
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const position = computePosition(anchorRect, overlayRect, placement, offset);
      const x = clamp(position.x, inset, Math.max(inset, viewportWidth - overlayRect.width - inset));
      const y = clamp(position.y, inset, Math.max(inset, viewportHeight - overlayRect.height - inset));
      const scrollX = strategy === "absolute" ? window.scrollX : 0;
      const scrollY = strategy === "absolute" ? window.scrollY : 0;
      const minWidth = matchWidth ? anchorRect.width : null;
      const maxWidth = Math.max(0, viewportWidth - inset * 2);
      const maxHeight = Math.max(0, viewportHeight - inset * 2);

      write(() => {
        overlay.style.left = `${Math.round(x + scrollX)}px`;
        overlay.style.top = `${Math.round(y + scrollY)}px`;
        overlay.style.maxWidth = `${Math.round(maxWidth)}px`;
        overlay.style.maxHeight = `${Math.round(maxHeight)}px`;
        if (minWidth !== null) {
          overlay.style.minWidth = `${Math.round(minWidth)}px`;
        } else {
          overlay.style.removeProperty("min-width");
        }
        overlay.style.visibility = "visible";
      });
    });
  };

  scope.listen(window, "scroll", update, { capture: true, passive: true });
  scope.listen(window, "resize", update, { passive: true });
  scope.observeResize(anchor, update);
  scope.observeResize(overlay, update);
  scope.onCleanup(() => {
    overlay.style.removeProperty("position");
    overlay.style.removeProperty("left");
    overlay.style.removeProperty("top");
    overlay.style.removeProperty("max-width");
    overlay.style.removeProperty("max-height");
    overlay.style.removeProperty("min-width");
    overlay.style.removeProperty("visibility");
  });

  update();

  return {
    update,
  };
}

/**
 * @param {DOMRect} anchorRect
 * @param {DOMRect} overlayRect
 * @param {string} placement
 * @param {number} offset
 */
function computePosition(anchorRect, overlayRect, placement, offset) {
  const [side, align = "center"] = placement.split("-");

  if (side === "top") {
    return {
      x: alignX(anchorRect, overlayRect, align),
      y: anchorRect.top - overlayRect.height - offset,
    };
  }

  if (side === "bottom") {
    return {
      x: alignX(anchorRect, overlayRect, align),
      y: anchorRect.bottom + offset,
    };
  }

  if (side === "left") {
    return {
      x: anchorRect.left - overlayRect.width - offset,
      y: alignY(anchorRect, overlayRect, align),
    };
  }

  if (side === "right") {
    return {
      x: anchorRect.right + offset,
      y: alignY(anchorRect, overlayRect, align),
    };
  }

  throw new Error(`unsupported overlay placement \"${placement}\"`);
}

/**
 * @param {DOMRect} anchorRect
 * @param {DOMRect} overlayRect
 * @param {string} align
 */
function alignX(anchorRect, overlayRect, align) {
  if (align === "start") {
    return anchorRect.left;
  }
  if (align === "end") {
    return anchorRect.right - overlayRect.width;
  }
  return anchorRect.left + (anchorRect.width - overlayRect.width) / 2;
}

/**
 * @param {DOMRect} anchorRect
 * @param {DOMRect} overlayRect
 * @param {string} align
 */
function alignY(anchorRect, overlayRect, align) {
  if (align === "start") {
    return anchorRect.top;
  }
  if (align === "end") {
    return anchorRect.bottom - overlayRect.height;
  }
  return anchorRect.top + (anchorRect.height - overlayRect.height) / 2;
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

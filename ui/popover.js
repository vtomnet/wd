import { createPopoverController } from "../ui-core/popover.js";
import { template } from "./dom.js";

const popoverTemplate = template(`
  <div class="ui-popover" data-ref="root"></div>
`);

/**
 * @param {{
 *   content?: Node | null,
 *   trigger?: HTMLElement | null,
 *   closeButtons?: Iterable<HTMLElement>,
 *   scope?: { signal: AbortSignal },
 *   signal?: AbortSignal,
 * }} [options]
 */
export function popover(options = {}) {
  const ui = popoverTemplate.clone();
  if (options.content) {
    ui.root.append(options.content);
  }
  const controller = createPopoverController(ui.root, {
    trigger: options.trigger ?? null,
    closeButtons: options.closeButtons,
    scope: options.scope,
    signal: options.signal,
  });
  return {
    ...ui,
    controller,
  };
}

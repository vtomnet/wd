import { createDialogController } from "../ui-core/dialog.js";
import { template, text } from "./dom.js";

const dialogTemplate = template(`
  <dialog class="ui-dialog" data-ref="root">
    <form class="ui-dialog__surface" method="dialog" data-ref="surface">
      <header class="ui-dialog__header" data-ref="header" hidden>
        <h2 class="ui-dialog__title" data-ref="title" hidden></h2>
        <p class="ui-dialog__description" data-ref="description" hidden></p>
      </header>
      <div class="ui-dialog__body" data-ref="body"></div>
      <footer class="ui-dialog__footer" data-ref="footer" hidden></footer>
    </form>
  </dialog>
`);

/**
 * @param {{
 *   title?: string,
 *   description?: string,
 *   body?: Node | null,
 *   footer?: Node | null,
 *   trigger?: HTMLElement | null,
 *   closeButtons?: Iterable<HTMLElement>,
 *   scope?: { signal: AbortSignal },
 *   signal?: AbortSignal,
 * }} [options]
 */
export function dialog(options = {}) {
  const ui = dialogTemplate.clone();

  if (options.title) {
    ui.refs.header.hidden = false;
    ui.refs.title.hidden = false;
    text(ui.refs.title, options.title);
  }
  if (options.description) {
    ui.refs.header.hidden = false;
    ui.refs.description.hidden = false;
    text(ui.refs.description, options.description);
  }
  if (options.body) {
    ui.refs.body.append(options.body);
  }
  if (options.footer) {
    ui.refs.footer.hidden = false;
    ui.refs.footer.append(options.footer);
  }

  const controller = createDialogController(/** @type {HTMLDialogElement} */ (ui.root), {
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

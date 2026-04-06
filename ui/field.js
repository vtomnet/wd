import { template, text } from "./dom.js";

const fieldTemplate = template(`
  <div class="ui-field" data-ref="root">
    <label class="ui-label" data-ref="label" hidden></label>
    <div class="ui-field__control" data-ref="control"></div>
    <p class="ui-field__description" data-ref="description" hidden></p>
    <p class="ui-field__error" data-ref="error" hidden></p>
  </div>
`);

/**
 * @param {{
 *   label?: string,
 *   description?: string,
 *   error?: string,
 *   control?: HTMLElement | null,
 * }} [options]
 */
export function field(options = {}) {
  const ui = fieldTemplate.clone();

  if (options.label) {
    ui.refs.label.hidden = false;
    text(ui.refs.label, options.label);
  }
  if (options.description) {
    ui.refs.description.hidden = false;
    text(ui.refs.description, options.description);
  }
  if (options.error) {
    ui.refs.error.hidden = false;
    text(ui.refs.error, options.error);
  }
  if (options.control) {
    ui.refs.control.append(options.control);
    if (options.label && options.control instanceof HTMLElement && options.control.id) {
      ui.refs.label.setAttribute("for", options.control.id);
    }
  }

  return ui;
}

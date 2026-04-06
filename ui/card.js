import { template, text } from "./dom.js";

const cardTemplate = template(`
  <section class="ui-card" data-ref="root" data-slot="card">
    <header class="ui-card__header" data-ref="header" data-slot="card-header" hidden>
      <div class="ui-card__eyebrow" data-ref="eyebrow" hidden></div>
      <h2 class="ui-card__title" data-ref="title" data-slot="card-title" hidden></h2>
      <p class="ui-card__description" data-ref="description" data-slot="card-description" hidden></p>
    </header>
    <div class="ui-card__body" data-ref="body" data-slot="card-content"></div>
    <footer class="ui-card__footer" data-ref="footer" data-slot="card-footer" hidden></footer>
  </section>
`);

/**
 * @param {{
 *   eyebrow?: string,
 *   title?: string,
 *   description?: string,
 *   body?: Node | null,
 *   footer?: Node | null,
 * }} [options]
 */
export function card(options = {}) {
  const ui = cardTemplate.clone();

  if (options.eyebrow) {
    ui.refs.header.hidden = false;
    ui.refs.eyebrow.hidden = false;
    text(ui.refs.eyebrow, options.eyebrow);
  }
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

  return ui;
}

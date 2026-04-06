This directory is a no-framework Web Platform UI experiment.

The goal is not to recreate React or Svelte. The goal is a tiny retained-DOM runtime with a small number of obvious patterns, so both humans and coding agents have very few ways to do the wrong thing.

The runtime lives in `./runtime`.
The behavior primitives live in `./ui-core`.
The styled components live in `./ui`.

Core principles:

- One owned subtree per view.
- Static DOM shape comes from `template()`.
- Dynamic updates use direct bindings, not string rendering.
- Every side effect belongs to a `scope()`.
- Dynamic collections use `keyed()`.
- Route/page swapping uses `region()`.
- Layout reads happen in `read()`; layout-coupled writes happen in `write()`.
- Overlay positioning uses `anchorOverlay()`.
- Async work belongs to `resource()` or `scope().task()`.
- `innerHTML` is forbidden except through `bind.html()` with `safeHtml()`.

Hard rules:

- Do not write arbitrary `innerHTML`.
- Do not add event listeners except through `scope.listen()` or `bind.on()`.
- Do not start timers, observers, or fetches except through `scope()` helpers or `resource()`.
- Do not mutate DOM outside the subtree owned by the current view, except through an explicit overlay/portal host.
- Do not render dynamic arrays by rebuilding a whole container; use `keyed()`.
- Do not mix layout reads and DOM writes in the same ad hoc handler when positioning overlays or measuring UI. Use `read()` then `write()`.
- Do not introduce a virtual DOM, JSX runtime, or generic rerender mechanism.

UI rules:

- If the same control markup or control styling appears twice, it probably belongs in `ui/`.
- Prefer composing `ui` components over ad hoc button, input, checkbox, dialog, and card markup.
- `ui-core` should stay close to the platform. Prefer native buttons, inputs, checkboxes, dialog, and popover behavior over simulating them.
- `ui-core` and `ui` should not depend on `runtime` internals. They may accept `scope.signal` or a plain `AbortSignal`, but should stay usable from plain DOM code too.
- `ui` should expose standard DOM and standard CSS, not a custom DSL.

Runtime modules:

- `runtime/scope.js`: lifecycle, cleanup, listeners, timers, observers, fetch.
- `runtime/signal.js`: `signal`, `computed`, `effect`, `batch`, `untrack`.
- `runtime/template.js`: clone static DOM and collect `data-ref` references.
- `runtime/bind.js`: direct node/property/attribute/style bindings and safe HTML sink.
- `runtime/list.js`: keyed list reconciler with per-row scopes.
- `runtime/region.js`: swap one mounted subtree for another.
- `runtime/frame.js`: batched read/write phases for layout-sensitive code.
- `runtime/overlay.js`: minimal anchored overlay positioning.
- `runtime/resource.js`: cancellable async resource state.
- `runtime/router.js`: tiny history/popstate wrapper.

UI modules:

- `ui-core/events.js`: signal-aware event helpers.
- `ui-core/dialog.js`: native dialog controller.
- `ui-core/popover.js`: native popover controller.
- `ui/styles.css`: tokens and component styling.
- `ui/button.js`, `ui/input.js`, `ui/checkbox.js`: standard form controls.
- `ui/card.js`, `ui/field.js`, `ui/badge.js`, `ui/separator.js`: layout and display primitives.
- `ui/dialog.js`, `ui/popover.js`: styled shells on top of `ui-core` behavior.
- `ui/test`: isolated visual and component test harness pinned to actual upstream shadcn/ui source.

Blessed patterns:

A basic view:

```js
import { bind, scope, template } from "./runtime/index.js";

const panelTpl = template(`
  <section class="panel" data-ref="root">
    <h1 data-ref="title"></h1>
    <button data-ref="button" type="button">Toggle</button>
  </section>
`);

export function mountPanel(title) {
  const s = scope();
  const ui = panelTpl.clone();

  bind.text(ui.refs.title, title, { scope: s });
  s.listen(ui.refs.button, "click", () => {
    console.log("clicked");
  });

  return { scope: s, root: ui.root, refs: ui.refs };
}
```

A keyed list:

```js
keyed(listEl, items, (item) => item.id, (item, rowScope) => {
  const ui = rowTpl.clone();
  bind.text(ui.refs.label, () => item().label, { scope: rowScope });
  rowScope.listen(ui.root, "click", () => {
    console.log(item().id);
  });
  return ui.root;
}, { scope: parentScope });
```

A route shell:

```js
const app = region(root, { scope: pageScope });

effect(() => {
  const next = route();
  app.show((child) => {
    if (next.kind === "home") return mountHome(child).root;
    return mountNotFound(child).root;
  });
});
```

An overlay:

```js
const overlayScope = pageScope.child();
document.body.append(menuEl);
anchorOverlay(overlayScope, menuEl, buttonEl, {
  placement: "bottom-start",
  offset: 8,
});
```

Notes for agents:

- Prefer adding one small helper to `runtime/` over repeating a fragile pattern in app code.
- Keep APIs explicit. No magic proxies, decorators, or hidden rerender systems.
- If a helper is only needed in one app, keep it in that app until a second app needs it.
- Default to the simplest thing that preserves the invariants above.

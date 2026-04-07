# wd 🪵

`wd` is a small no-framework Web Platform UI experiment.

⚠️ everything below is slop ⚠️

The premise is simple. Modern browser primitives are much better than they were a decade ago, and coding agents are now capable of writing large amounts of local code quickly. That changes the tradeoff. Instead of reaching first for a large framework, a compiler, and a large component ecosystem, this project asks whether a small amount of disciplined utility code can provide enough structure to build real apps while keeping the code on disk close to the code that runs in the browser.

This repository currently has three layers.

`rt/` is the retained-DOM runtime. It handles state, lifecycle, binding, list reconciliation, routing, and layout-sensitive scheduling.

`ui-core/` is the behavior layer. It is intentionally small and sticks closely to the platform. It provides behavior primitives such as dialog and popover control, and it stays usable from plain DOM code without depending on the runtime.

`ui/` is the styled component layer. It provides a small set of default controls and surfaces with ordinary DOM and ordinary CSS. It is meant to reduce repeated brittle markup and style drift, not to create a DSL. It is intended to be a pixel perfect clone of shadcn/ui.

`example/` is a simple server-client todo app that exercises the current stack.

`ui/test/` is a standalone visual comparison harness that renders our components next to actual upstream shadcn/ui components and diffs screenshots.

This `README.md` is the canonical documentation for the repository.

## Philosophy

The goal is not to recreate React, Svelte, or a virtual DOM at runtime. The goal is a very small retained-DOM model with clear ownership and very few ways to update the UI.

Static DOM shape should be declared once and then retained. We prefer cloning `<template>` content and binding directly to stable nodes over rerendering strings or rebuilding entire subtrees.

Dynamic updates should target the exact node or property that changed. If a text node changes, update that text node. If a class changes, toggle that class. If an input value changes, write that value. Generic rerender mechanisms are exactly the kind of freedom that causes codebases to drift.

Lifecycle should be explicit. Listeners, timers, observers, async tasks, and child views all belong to a scope. Cleanup should be one operation, not a scavenger hunt.

Layout-sensitive work should happen with an explicit timing model. If code reads layout and then writes layout-coupled styles, it should do so through a read phase and a write phase rather than through ad hoc DOM access scattered across event handlers.

A view should own one subtree. Cross-subtree mutation should be exceptional and should go through an explicit overlay or portal mechanism.

Collections should have one blessed path. Dynamic lists should go through keyed reconciliation so rows are reused, reordered, and disposed consistently.

Minimal magic is deliberate. Signals are explicit. Bindings are explicit. Async resources are explicit. There is no hidden rerender system, no proxy-based deep magic, and no compile-time dependency in the core model.

The repository is also intentionally agent-oriented. Coding agents are good at producing working local code, but weak at preserving abstraction boundaries when the design space is too open. The runtime and UI layers exist partly to narrow that space so the good path is short and the bad path is visibly off-model.

The rough aspiration is closer to Zig than to old-school ad hoc DOM code: explicit, manual where it matters, and shaped enough to keep footguns away from the default path.

## Core rules

A few rules are non-negotiable.

Do not write arbitrary `innerHTML`. If HTML injection is needed, it must go through `bind.html()` and `safeHtml()`.

Do not attach listeners, timers, observers, or fetches ad hoc when a scoped helper already exists. Effects should belong to a scope.

Do not mutate DOM outside the subtree owned by the current view except through an explicit overlay or portal host.

Do not rebuild dynamic collections by hand. Use keyed reconciliation.

Do not mix layout reads and writes casually in the same handler when positioning or measuring UI. Measure in `read()`, mutate in `write()`.

Do not introduce a virtual DOM, JSX runtime, or generic rerender layer into the runtime.

At the UI layer, if the same control markup or control styling appears twice, it should usually become a component in `ui/` or a refinement of an existing component. App code should not keep hand-authoring slightly different buttons, inputs, checkboxes, cards, and hover states.

## Runtime

The runtime is the structural layer. Its job is to make retained-DOM code predictable and hard to misuse.

`rt/scope.js` provides lifecycle, cleanup, listeners, timers, observers, and fetch helpers.

`rt/signal.js` provides `signal`, `computed`, `effect`, `batch`, and `untrack`. The current version includes a fix for resubscribe-during-flush loops by snapshotting subscriber sets before scheduling.

`rt/template.js` clones static DOM and collects `data-ref` references.

`rt/bind.js` performs direct text, property, attribute, class, style, checked, input, and safe HTML binding.

`rt/list.js` provides keyed list reconciliation with per-row scopes.

`rt/region.js` swaps one owned subtree for another.

`rt/frame.js` provides explicit read and write phases for layout-sensitive code.

`rt/overlay.js` positions simple anchored overlays.

`rt/resource.js` wraps cancellable async resource state.

`rt/router.js` wraps the History API.

A typical retained-DOM view looks like this:

```js
import { bind, keyed, scope, signal, template } from "./rt/index.js";

const panelTpl = template(`
  <section class="panel" data-ref="root">
    <h1 data-ref="title"></h1>
    <ul data-ref="list"></ul>
  </section>
`);

export function mountPanel(items) {
  const s = scope();
  const ui = panelTpl.clone();
  const title = signal("Items");

  bind.text(ui.refs.title, title, { scope: s });

  keyed(ui.refs.list, items, (item) => item.id, (item, rowScope) => {
    const li = document.createElement("li");
    bind.text(li, () => item().label, { scope: rowScope });
    return li;
  }, { scope: s });

  return { scope: s, root: ui.root, refs: ui.refs };
}
```

## ui-core

`ui-core/` is the behavior layer.

It stays close to the platform and does not depend on `rt`. It may accept a plain `AbortSignal` or `scope.signal`, but it should remain usable from ordinary DOM code too.

The rule of thumb is to prefer native elements and native behavior wherever they are good enough. Buttons should be real buttons. Inputs should be real inputs. Checkboxes should be real checkboxes. Dialogs should use `<dialog>` unless there is a strong reason not to. Popovers should lean on the Popover API where possible.

At the moment `ui-core/events.js` provides signal-aware event helpers, `ui-core/dialog.js` provides native dialog control, and `ui-core/popover.js` provides native popover control.

## ui

`ui/` is the styled component layer.

Its purpose is not to hide HTML and CSS. Its purpose is to make the common controls and surfaces look consistent by default, so agents and humans stop rewriting brittle button, checkbox, input, badge, card, and dialog markup in every app.

Components return normal DOM nodes. Styling is ordinary CSS in `ui/styles.css`. Apps can still override CSS with normal selectors and properties.

The current surface includes buttons, badges, inputs, textareas, selects, checkboxes, cards, fields, separators, dialogs, popovers, and icon rendering.

The icon system lives in `ui/icon.js` and `ui/icons/`. Icons are inline SVG DOM, not a runtime network fetch and not a runtime dependency on `lucide`. The installed icon set is declared explicitly in `ui/icons/manifest.json`, and `ui/icons/sync.js` regenerates `ui/icons/generated/*.js` plus `ui/icons/index.js` from upstream Lucide SVG sources.

The current design target for `ui/` is faithfulness to shadcn/ui. That means the repository is not trying to invent a new visual language right now. The goal is to converge on a proven clean default for spacing, radii, states, typography, and motion.

## ui/test

`ui/test/` is the dev-only visual regression harness for the UI layer.

It is intentionally standalone and is allowed to have heavier development dependencies than the main library. It runs its own Vite server, renders our components in one mode and actual upstream shadcn/ui React components in another mode, captures screenshots with Puppeteer, and diffs them with `pixelmatch`.

The harness is pinned to an upstream shadcn/ui source release, currently `4.1.2`, rather than depending on a local checkout. This keeps the reference reproducible.

The per-component test fixtures live in `ui/test/components/`. Shared harness logic lives in `ui/test/components/_util.js`. The screenshot artifacts are written to `ui/test/artifacts/` when a case fails.

To run the visual comparison harness:

```sh
cd ui/test
npm install
npm test
```

The harness currently reports both pixel diffs and size mismatches. Size mismatches are shown explicitly as size mismatches rather than as an artificial `Infinity px diff` sentinel.

## Example app

`example/` is a small server-client todo app. It is intentionally simple, but it exercises the stack in a useful way: signals, bindings, keyed lists, resources, UI components, and server interaction.

Run it with:

```sh
cd example
node server.js
```

Then open `http://127.0.0.1:3000`.

The todo app is also the current integration sandbox for polishing `ui/`. As the UI layer improves, the example should become a cleaner and more canonical reference app.

## Notes for contributors and agents

When adding new structure, prefer a small helper over repeating a fragile pattern. Keep APIs explicit. If a helper is only needed in one app, keep it local until a second app needs it.

When adding new visual patterns, prefer improving `ui/` over hand-authoring another slightly different control.

When working on component faithfulness, use `ui/test` as the reward signal. The reference side should stay grounded in real upstream shadcn/ui components, not a hand-copied approximation.

When in doubt, choose the simpler model with fewer degrees of freedom.

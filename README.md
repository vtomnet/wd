# 🪵 wd

wd is a small no-framework Web Platform UI experiment. The premise is that modern browser primitives, plus a tiny amount of disciplined utility code, may be enough to build serious apps without taking on a large framework dependency or a compile step.

## Philosophy

The goal is not to recreate React, Svelte, or a virtual DOM in plain JavaScript. The goal is a very small retained-DOM runtime with a narrow and explicit model, so both humans and coding agents have fewer ways to create accidental complexity.

A few principles guide the design.

Static DOM shape should be declared once and then retained. We prefer cloning `<template>` content and binding directly to stable nodes over rerendering strings or rebuilding whole subtrees.

Dynamic updates should target the exact node or property that changed. Updating a text node, a class, a style field, or an input value is usually simpler and cheaper than generic rerender machinery.

Lifecycle must be explicit. Every listener, timer, observer, async task, and child view belongs to a scope and gets torn down with that scope. Cleanup should be a single operation, not an audit.

Layout-sensitive work needs a disciplined timing model. If code reads layout and then writes layout-coupled styles, it should do so through an explicit read phase and write phase rather than ad hoc DOM access scattered through event handlers.

Ownership matters. A view owns one subtree. It should not mutate arbitrary DOM elsewhere unless it is doing so through an explicit overlay or portal mechanism.

Collections need one blessed path. Dynamic lists should go through a keyed reconciler so rows are reused, moved, and cleaned up consistently instead of being recreated by hand.

Minimal magic is a feature. Signals, bindings, and async resources should be explicit. We do not want hidden rerender systems, deep proxy magic, or compile-time tricks in the core model.

This project is also explicitly agent-oriented. LLM coding agents are good at producing working local code, but weak at preserving abstraction boundaries in an unconstrained codebase. The runtime and docs are meant to narrow the design space enough that the good path is short and the bad path is visibly off-model.

The standard to aim for is closer to Zig than to old-school ad hoc DOM code: explicit and manual where it matters, but shaped enough that common footguns are pushed out of the default path.

## Runtime

The first pass of the runtime lives in `./runtime`.

- `scope.js` handles lifecycle, cleanup, listeners, timers, observers, and fetch.
- `signal.js` provides `signal`, `computed`, `effect`, `batch`, and `untrack`.
- `template.js` clones static DOM and collects `data-ref` references.
- `bind.js` performs direct text/property/attribute/style bindings.
- `list.js` provides keyed list reconciliation.
- `region.js` swaps one owned subtree for another.
- `frame.js` provides explicit read and write phases for layout-sensitive work.
- `overlay.js` positions simple anchored overlays.
- `resource.js` wraps cancellable async resources.
- `router.js` wraps the History API.

## ui-core and ui

The second layer lives in `./ui-core` and `./ui`.

`ui-core` is the behavior layer. It should stay small and rely on standard platform behavior where possible. It is intentionally independent from `runtime`; it works with plain DOM and optional `AbortSignal` or `scope.signal`. This keeps the behavior primitives portable and prevents the visual layer from becoming entangled with one state model.

`ui` is the styled component layer. It also stays close to native HTML. Components return normal DOM nodes, styling is ordinary CSS, and app code can still override standard CSS properties directly. The point is not to create a DSL. The point is to give agents and humans a small set of good-looking, accessible defaults so the same brittle control markup and ad hoc hover states are not rewritten in every app.

`ui/test` is an isolated dev-only test package. It is where visual comparison and other component-level tests should live. Keeping it separate avoids pulling Playwright and image diff tooling into runtime package metadata. The harness pins an upstream shadcn/ui source revision and renders the actual upstream React components as the reference side, rather than copying reference markup into this repo.

## Example

A small server-client todo app lives in `./example`.

Run it with:

```sh
cd example
node server.js
```

Then open `http://127.0.0.1:3000`.

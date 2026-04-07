import { effect, signal } from "./signal.js";

/**
 * @param {Node | { root: Node }} value
 * @returns {Node}
 */
function unwrapNode(value) {
  if (value instanceof Node) {
    return value;
  }
  if (value && value.root instanceof Node) {
    return value.root;
  }
  throw new Error("keyed() render callback must return a Node or { root }");
}

/**
 * @template T
 * @param {Element} container
 * @param {T[] | (() => T[])} items
 * @param {(item: T) => string | number} getKey
 * @param {(item: (() => T) & { set(value: T): T }, rowScope: import("./scope.js").Scope, key: string | number) => Node | { root: Node }} render
 * @param {{ scope: import("./scope.js").Scope }} options
 */
export function keyed(container, items, getKey, render, options) {
  if (!options?.scope) {
    throw new Error("keyed() requires a scope");
  }

  const readItems = typeof items === "function" ? items : () => items;
  /** @type {Map<string | number, { node: Node, scope: import("./scope.js").Scope, item: (() => T) & { set(value: T): T } }>} */
  const rows = new Map();

  const stop = effect(() => {
    const nextItems = readItems() ?? [];
    if (!Array.isArray(nextItems)) {
      throw new Error("keyed() items must be an array");
    }

    const seen = new Set();
    let cursor = container.firstChild;

    for (const item of nextItems) {
      const key = getKey(item);
      if (seen.has(key)) {
        throw new Error(`keyed() encountered duplicate key \"${String(key)}\"`);
      }
      seen.add(key);

      let row = rows.get(key);
      if (!row) {
        const rowScope = options.scope.child();
        const itemState = signal(item);
        const node = unwrapNode(render(itemState, rowScope, key));
        row = {
          node,
          scope: rowScope,
          item: itemState,
        };
        rows.set(key, row);
      } else {
        row.item.set(item);
      }

      if (row.node !== cursor) {
        container.insertBefore(row.node, cursor);
      }
      cursor = row.node.nextSibling;
    }

    for (const [key, row] of rows) {
      if (seen.has(key)) {
        continue;
      }
      row.scope.abort();
      row.node.remove();
      rows.delete(key);
    }
  }, { scope: options.scope });

  const clear = () => {
    for (const row of rows.values()) {
      row.scope.abort();
      row.node.remove();
    }
    rows.clear();
  };

  options.scope.onCleanup(() => {
    stop();
    clear();
  });

  return {
    clear,
    rows,
    stop,
  };
}

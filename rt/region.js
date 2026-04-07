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
  throw new Error("region.show() must return a Node or { root }");
}

/**
 * @param {Element} container
 * @param {{ scope: import("./scope.js").Scope }} options
 */
export function region(container, options) {
  if (!options?.scope) {
    throw new Error("region() requires a scope");
  }

  /** @type {import("./scope.js").Scope | null} */
  let current = null;

  const clear = () => {
    if (current !== null) {
      current.abort();
      current = null;
    }
    container.replaceChildren();
  };

  options.scope.onCleanup(clear);

  return {
    clear,

    current() {
      return current;
    },

    /**
     * @param {(scope: import("./scope.js").Scope) => Node | { root: Node }} render
     */
    show(render) {
      clear();
      const child = options.scope.child();
      try {
        const node = unwrapNode(render(child));
        container.replaceChildren(node);
        child.onCleanup(() => {
          if (node.parentNode === container) {
            node.remove();
          }
        });
        current = child;
        return child;
      } catch (error) {
        child.abort(error);
        throw error;
      }
    },
  };
}

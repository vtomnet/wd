/**
 * @param {string} markup
 */
export function template(markup) {
  const element = document.createElement("template");
  element.innerHTML = markup.trim();

  const nodes = Array.from(element.content.childNodes).filter((node) => {
    return !(node.nodeType === Node.TEXT_NODE && node.textContent?.trim() === "");
  });

  if (nodes.length !== 1 || !(nodes[0] instanceof Element)) {
    throw new Error("template() requires exactly one root element");
  }

  const sourceRoot = nodes[0];

  return {
    clone() {
      const root = /** @type {Element} */ (document.importNode(sourceRoot, true));
      const refs = collectRefs(root);
      return { root, refs };
    },
  };
}

/**
 * @param {Element} root
 */
function collectRefs(root) {
  /** @type {Record<string, Element>} */
  const refs = {};

  const assign = (element) => {
    const name = element.getAttribute("data-ref");
    if (!name) {
      return;
    }
    if (name in refs) {
      throw new Error(`duplicate data-ref \"${name}\"`);
    }
    refs[name] = element;
  };

  assign(root);
  for (const element of root.querySelectorAll("[data-ref]")) {
    assign(/** @type {Element} */ (element));
  }

  return refs;
}

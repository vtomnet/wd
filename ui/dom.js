/**
 * @param {...(string | false | null | undefined)} parts
 */
export function classes(...parts) {
  return parts.filter(Boolean).join(" ");
}

/**
 * @param {string} markup
 */
export function template(markup) {
  const element = document.createElement("template");
  element.innerHTML = markup.trim();
  const root = element.content.firstElementChild;
  if (!(root instanceof Element) || root.nextElementSibling !== null) {
    throw new Error("ui template requires exactly one root element");
  }
  return {
    clone() {
      const node = /** @type {Element} */ (root.cloneNode(true));
      return {
        root: node,
        refs: refs(node),
      };
    },
  };
}

/**
 * @param {Element} root
 */
export function refs(root) {
  /** @type {Record<string, Element>} */
  const values = {};

  const add = (element) => {
    const key = element.getAttribute("data-ref");
    if (!key) {
      return;
    }
    if (key in values) {
      throw new Error(`duplicate data-ref \"${key}\"`);
    }
    values[key] = element;
  };

  add(root);
  for (const element of root.querySelectorAll("[data-ref]")) {
    add(/** @type {Element} */ (element));
  }
  return values;
}

/**
 * @param {Element} node
 * @param {Record<string, string | number | boolean | null | undefined>} attributes
 */
export function attrs(node, attributes) {
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null || value === false) {
      continue;
    }
    node.setAttribute(name, value === true ? "" : String(value));
  }
  return node;
}

/**
 * @param {Element} node
 * @param {string | null | undefined} value
 */
export function text(node, value) {
  node.textContent = value ?? "";
  return node;
}

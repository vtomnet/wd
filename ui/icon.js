/**
 * @param {string} name
 * @param {Record<string, string>} attributes
 */
function createNode(name, attributes) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, value);
  }
  return node;
}

/**
 * @param {{ name: string, contents: Array<[string, Record<string, string>]> }} source
 * @param {{
 *   className?: string,
 *   size?: number | string,
 *   color?: string,
 *   strokeWidth?: number | string,
 *   absoluteStrokeWidth?: boolean,
 *   ariaLabel?: string,
 *   title?: string,
 * }} [options]
 */
export function icon(source, options = {}) {
  const size = options.size ?? 24;
  const strokeWidth = Number(options.strokeWidth ?? 2);
  const numericSize = Number(size);
  const resolvedStrokeWidth = options.absoluteStrokeWidth && Number.isFinite(numericSize)
    ? strokeWidth * 24 / numericSize
    : strokeWidth;
  const svg = createNode("svg", {
    xmlns: "http://www.w3.org/2000/svg",
    width: String(size),
    height: String(size),
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: options.color ?? "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-width": String(resolvedStrokeWidth),
    class: ["ui-icon", options.className].filter(Boolean).join(" "),
  });

  if (options.ariaLabel || options.title) {
    svg.setAttribute("role", "img");
    if (options.ariaLabel) {
      svg.setAttribute("aria-label", options.ariaLabel);
    }
  } else {
    svg.setAttribute("aria-hidden", "true");
  }

  if (options.title) {
    const title = createNode("title", {});
    title.textContent = options.title;
    svg.append(title);
  }

  for (const [name, attributes] of source.contents) {
    svg.append(createNode(name, attributes));
  }

  return svg;
}

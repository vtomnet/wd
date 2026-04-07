export const SHADCN_ROOT = "/node_modules/shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui";

export async function renderReact(root, element) {
  const { createRoot } = await import("react-dom/client");

  const reactRoot = createRoot(root);
  reactRoot.render(element);
  await nextFrame();
  await nextFrame();
  return {
    root: reactRoot,
    unmount() {
      reactRoot.unmount();
    },
  };
}

export function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export async function mountComparison(root, impl, handlers) {
  root.className = "ref-root";

  if (impl === "ours") {
    const element = await handlers.ours();
    element.setAttribute("data-test-target", "");
    root.append(element);
    return element;
  }

  return handlers.reference();
}

export async function focusTarget(root) {
  const element = root.querySelector("[data-test-target]");
  if (!(element instanceof HTMLElement)) {
    throw new Error("missing [data-test-target]");
  }
  element.focus();
  await nextFrame();
  return element;
}

export const SHADCN_ROOT = "/node_modules/shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui";

export async function renderReact(root, element) {
  const { createRoot } = await import("react-dom/client");

  const reactRoot = createRoot(root);
  reactRoot.render(element);
  return {
    root: reactRoot,
    unmount() {
      reactRoot.unmount();
    },
  };
}

export function createSuiteGrid(root, columns) {
  root.className = "ref-root";
  root.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "suite-grid";
  grid.style.setProperty("--suite-columns", String(columns));
  root.append(grid);
  return grid;
}

export function createSuiteFrame(caseItem) {
  const frame = document.createElement("div");
  frame.className = "suite-frame";
  frame.setAttribute("data-suite-case-id", caseItem.id);
  frame.setAttribute("data-suite-case-name", caseItem.name);
  frame.setAttribute("data-suite-case-state", caseItem.pseudoState ?? caseItem.state);

  const caseRoot = document.createElement("div");
  caseRoot.className = "suite-case-root";
  frame.append(caseRoot);

  return {
    frame,
    root: caseRoot,
  };
}

export function suiteFrameProps(caseItem) {
  return {
    className: "suite-frame",
    "data-suite-case-id": caseItem.id,
    "data-suite-case-name": caseItem.name,
    "data-suite-case-state": caseItem.pseudoState ?? caseItem.state,
  };
}

export function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

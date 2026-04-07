import { SHADCN_ROOT, createSuiteFrame, createSuiteGrid, renderReact, suiteFrameProps } from "./_util.js";

export const name = "separator";

export const scenarios = [
  { name: "horizontal", states: ["idle"], themes: ["light", "dark"] },
  { name: "vertical", states: ["idle"], themes: ["light", "dark"] },
];

export async function renderSuite({ root, impl, cases, columns }) {
  if (impl === "ours") {
    const { separator } = await import("../../separator.js");
    const grid = createSuiteGrid(root, columns);

    for (const caseItem of cases) {
      const frame = createSuiteFrame(caseItem);
      const element = separator({ orientation: caseItem.scenario });
      applySize(element, caseItem.scenario);
      element.setAttribute("data-test-target", "");
      frame.root.append(element);
      grid.append(frame.frame);
    }
    return;
  }

  const [React, { Separator }] = await Promise.all([
    import("react"),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/separator.tsx`),
  ]);

  return await renderReact(root, React.createElement(
    "div",
    {
      className: "suite-grid",
      style: { "--suite-columns": String(columns) },
    },
    cases.map((caseItem) => React.createElement(
      "div",
      {
        ...suiteFrameProps(caseItem),
        key: caseItem.id,
      },
      React.createElement(
        "div",
        { className: "suite-case-root" },
        React.createElement(Separator, {
          orientation: caseItem.scenario,
          style: sizeStyle(caseItem.scenario),
          "data-test-target": "",
        }),
      ),
    )),
  ));
}

function applySize(element, scenario) {
  if (scenario === "vertical") {
    element.style.height = "64px";
    return;
  }
  element.style.width = "240px";
}

function sizeStyle(scenario) {
  if (scenario === "vertical") {
    return { height: "64px" };
  }
  return { width: "240px" };
}

import { SHADCN_ROOT, createSuiteFrame, createSuiteGrid, renderReact, suiteFrameProps } from "./_util.js";

export const name = "badge";

export const scenarios = [
  { name: "secondary", states: ["idle"] },
  { name: "outline", states: ["idle"] },
  { name: "destructive", states: ["idle"] },
];

export async function renderSuite({ root, impl, cases, columns }) {
  if (impl === "ours") {
    const { badge } = await import("../../badge.js");
    const grid = createSuiteGrid(root, columns);

    for (const caseItem of cases) {
      const frame = createSuiteFrame(caseItem);
      const element = badge({ label: labelFor(caseItem.scenario), variant: caseItem.scenario });
      element.setAttribute("data-test-target", "");
      frame.root.append(element);
      grid.append(frame.frame);
    }
    return;
  }

  const [React, { Badge }] = await Promise.all([
    import("react"),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/badge.tsx`),
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
        React.createElement(Badge, {
          variant: caseItem.scenario,
          "data-test-target": "",
        }, labelFor(caseItem.scenario)),
      ),
    )),
  ));
}

function labelFor(scenario) {
  if (scenario === "outline") {
    return "Outline";
  }
  if (scenario === "destructive") {
    return "Error";
  }
  return "Badge";
}

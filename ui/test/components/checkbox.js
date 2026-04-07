import { SHADCN_ROOT, createSuiteFrame, createSuiteGrid, renderReact, suiteFrameProps } from "./_util.js";

export const name = "checkbox";

export const scenarios = [
  { name: "idle", states: ["idle", "hover"] },
  { name: "checked", states: ["idle", "hover"] },
  { name: "focus", states: ["idle"], pseudoState: "focus" },
  { name: "disabled", states: ["idle"] },
];

export async function renderSuite({ root, impl, cases, columns }) {
  if (impl === "ours") {
    const { checkbox } = await import("../../checkbox.js");
    const grid = createSuiteGrid(root, columns);

    for (const caseItem of cases) {
      const frame = createSuiteFrame(caseItem);
      const element = checkbox({ ariaLabel: "Accept terms" });
      applyState(element, caseItem.scenario);
      element.setAttribute("data-test-target", "");
      frame.root.append(element);
      grid.append(frame.frame);
    }
    return;
  }

  const [React, { Checkbox }] = await Promise.all([
    import("react"),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/checkbox.tsx`),
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
        React.createElement(Checkbox, {
          "aria-label": "Accept terms",
          defaultChecked: caseItem.scenario === "checked" || caseItem.scenario === "disabled",
          disabled: caseItem.scenario === "disabled",
          "data-test-target": "",
        }),
      ),
    )),
  ));
}

function applyState(element, scenario) {
  if (scenario === "checked") {
    element.checked = true;
  }
  if (scenario === "disabled") {
    element.disabled = true;
    element.checked = true;
  }
}

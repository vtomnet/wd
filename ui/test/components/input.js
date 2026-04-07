import { SHADCN_ROOT, createSuiteFrame, createSuiteGrid, renderReact, suiteFrameProps } from "./_util.js";

export const name = "input";

export const scenarios = [
  { name: "default", states: ["idle"] },
  { name: "focus", states: ["idle"], pseudoState: "focus" },
  { name: "disabled", states: ["idle"] },
];

export async function renderSuite({ root, impl, cases, columns }) {
  if (impl === "ours") {
    const { input } = await import("../../input.js");
    const grid = createSuiteGrid(root, columns);

    for (const caseItem of cases) {
      const frame = createSuiteFrame(caseItem);
      const element = input({ placeholder: "Email address" });
      element.style.width = "240px";
      applyState(element, caseItem.scenario);
      element.setAttribute("data-test-target", "");
      frame.root.append(element);
      grid.append(frame.frame);
    }
    return;
  }

  const [React, { Input }] = await Promise.all([
    import("react"),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/input.tsx`),
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
        React.createElement(Input, {
          placeholder: "Email address",
          style: { width: "240px" },
          defaultValue: caseItem.scenario === "disabled" ? "hello@example.com" : undefined,
          disabled: caseItem.scenario === "disabled",
          "data-test-target": "",
        }),
      ),
    )),
  ));
}

function applyState(element, scenario) {
  if (scenario === "disabled") {
    element.disabled = true;
    element.value = "hello@example.com";
  }
}

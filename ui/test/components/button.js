import { SHADCN_ROOT, createSuiteFrame, createSuiteGrid, renderReact, suiteFrameProps } from "./_util.js";

export const name = "button";

export const scenarios = [
  { name: "default", states: ["idle", "hover", "active"] },
  { name: "secondary", states: ["idle", "hover", "active"] },
  { name: "outline", states: ["idle", "hover", "active"] },
  { name: "ghost", states: ["idle", "hover", "active"] },
  { name: "destructive", states: ["idle", "hover", "active"] },
  { name: "link", states: ["idle", "hover", "active"] },
  { name: "icon-sm", states: ["idle", "hover", "active"] },
  { name: "with-icon", states: ["idle", "hover", "active"] },
];

export async function renderSuite({ root, impl, cases, columns }) {
  if (impl === "ours") {
    const [{ button }, { icon }, { plus }] = await Promise.all([
      import("../../button.js"),
      import("../../icon.js"),
      import("../../icons/index.js"),
    ]);

    const grid = createSuiteGrid(root, columns);
    for (const caseItem of cases) {
      const frame = createSuiteFrame(caseItem);
      const element = renderOurs(button, icon, plus, caseItem.scenario);
      element.setAttribute("data-test-target", "");
      frame.root.append(element);
      grid.append(frame.frame);
    }
    return;
  }

  const [React, { Button }, { PlusIcon }] = await Promise.all([
    import("react"),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/button.tsx`),
    import("lucide-react"),
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
        React.createElement(Button, {
          ...buttonProps(caseItem.scenario),
          "data-test-target": "",
        }, buttonChildren(React, PlusIcon, caseItem.scenario)),
      ),
    )),
  ));
}

function renderOurs(button, icon, plus, scenario) {
  if (scenario === "icon-sm") {
    return button({ size: "icon-sm", variant: "outline", ariaLabel: "Add", start: icon(plus) });
  }
  if (scenario === "with-icon") {
    return button({ label: "New", variant: "default", start: icon(plus) });
  }
  return button({ label: labelFor(scenario), variant: scenario === "default" ? "default" : scenario });
}

function buttonProps(scenario) {
  if (scenario === "icon-sm") {
    return { size: "icon-sm", variant: "outline", "aria-label": "Add" };
  }
  if (scenario === "with-icon") {
    return { variant: "default" };
  }
  return { variant: scenario === "default" ? "default" : scenario };
}

function buttonChildren(React, PlusIcon, scenario) {
  if (scenario === "icon-sm") {
    return React.createElement(PlusIcon);
  }
  if (scenario === "with-icon") {
    return [React.createElement(PlusIcon, { key: "icon" }), "New"];
  }
  return labelFor(scenario);
}

function labelFor(scenario) {
  switch (scenario) {
    case "secondary":
      return "Secondary";
    case "outline":
      return "Outline";
    case "ghost":
      return "Ghost";
    case "destructive":
      return "Delete";
    case "link":
      return "Learn more";
    default:
      return "Button";
  }
}

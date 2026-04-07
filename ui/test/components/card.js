import { SHADCN_ROOT, createSuiteFrame, createSuiteGrid, renderReact, suiteFrameProps } from "./_util.js";

export const name = "card";

export const scenarios = [
  { name: "basic", states: ["idle"] },
];

export async function renderSuite({ root, impl, cases, columns }) {
  if (impl === "ours") {
    const [{ badge }, { card }] = await Promise.all([
      import("../../badge.js"),
      import("../../card.js"),
    ]);

    const grid = createSuiteGrid(root, columns);
    for (const caseItem of cases) {
      const frame = createSuiteFrame(caseItem);
      const element = renderOursCard(badge, card);
      element.setAttribute("data-test-target", "");
      frame.root.append(element);
      grid.append(frame.frame);
    }
    return;
  }

  const [React, cardModule, badgeModule] = await Promise.all([
    import("react"),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/card.tsx`),
    import(/* @vite-ignore */ `${SHADCN_ROOT}/badge.tsx`),
  ]);

  const { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } = cardModule;
  const { Badge } = badgeModule;

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
        React.createElement(Card, {
          style: { width: "320px" },
          "data-test-target": "",
        }, [
          React.createElement(CardHeader, { key: "header" }, [
            React.createElement(CardTitle, { key: "title" }, "Notifications"),
            React.createElement(CardDescription, { key: "description" }, "Manage your account alerts."),
          ]),
          React.createElement(CardContent, { key: "content" }, "A compact card used to group related content."),
          React.createElement(CardFooter, { key: "footer" }, React.createElement(Badge, { variant: "secondary" }, "Ready")),
        ]),
      ),
    )),
  ));
}

function renderOursCard(badge, card) {
  const body = document.createElement("div");
  body.textContent = "A compact card used to group related content.";
  const footer = badge({ label: "Ready", variant: "secondary" });
  const element = card({
    title: "Notifications",
    description: "Manage your account alerts.",
    body,
    footer,
  }).root;
  element.style.width = "320px";
  return element;
}

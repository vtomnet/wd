export const name = "card";

export const scenarios = [
  { name: "basic", states: ["idle"] },
];

export async function mount({ root, impl }) {
  root.className = "ref-root";
  if (impl === "ours") {
    const { badge, card } = await import("../../index.js");
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
    element.setAttribute("data-test-target", "");
    root.append(element);
    return;
  }

  const [React, { renderReact }, cardModule, badgeModule] = await Promise.all([
    import("react"),
    import("../render.js"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/card.tsx"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/badge.tsx"),
  ]);

  const { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } = cardModule;
  const { Badge } = badgeModule;

  await renderReact(root, React.createElement(Card, {
    style: { width: "320px" },
    "data-test-target": "",
  }, [
    React.createElement(CardHeader, { key: "header" }, [
      React.createElement(CardTitle, { key: "title" }, "Notifications"),
      React.createElement(CardDescription, { key: "description" }, "Manage your account alerts."),
    ]),
    React.createElement(CardContent, { key: "content" }, "A compact card used to group related content."),
    React.createElement(CardFooter, { key: "footer" }, React.createElement(Badge, { variant: "secondary" }, "Ready")),
  ]));
}

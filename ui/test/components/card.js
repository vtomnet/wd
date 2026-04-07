import { SHADCN_ROOT, mountComparison, renderReact } from "./_util.js";

export const name = "card";

export const scenarios = [
  { name: "basic", states: ["idle"] },
];

export async function mount({ root, impl }) {
  await mountComparison(root, impl, {
    async ours() {
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
      return element;
    },

    async reference() {
      const [React, cardModule, badgeModule] = await Promise.all([
        import("react"),
        import(/* @vite-ignore */ `${SHADCN_ROOT}/card.tsx`),
        import(/* @vite-ignore */ `${SHADCN_ROOT}/badge.tsx`),
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
    },
  });
}

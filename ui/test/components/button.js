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

export async function mount({ root, impl, scenario }) {
  root.className = "ref-root";
  if (impl === "ours") {
    const [{ button, icon }, { plus }] = await Promise.all([
      import("../../index.js"),
      import("../../icons/index.js"),
    ]);
    const element = renderOurs(button, icon, plus, scenario);
    element.setAttribute("data-test-target", "");
    root.append(element);
    return;
  }

  const [React, { renderReact }, { Button }, { PlusIcon }] = await Promise.all([
    import("react"),
    import("../render.js"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/button.tsx"),
    import("lucide-react"),
  ]);

  const props = buttonProps(scenario);
  const iconNode = scenario === "icon-sm" || scenario === "with-icon"
    ? React.createElement(PlusIcon)
    : null;
  const children = scenario === "icon-sm"
    ? iconNode
    : scenario === "with-icon"
      ? [iconNode, "New"]
      : labelFor(scenario);

  await renderReact(root, React.createElement(Button, {
    ...props,
    "data-test-target": "",
  }, children));
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

export const name = "badge";

export const scenarios = [
  { name: "secondary", states: ["idle"] },
  { name: "outline", states: ["idle"] },
  { name: "destructive", states: ["idle"] },
];

export async function mount({ root, impl, scenario }) {
  root.className = "ref-root";
  if (impl === "ours") {
    const { badge } = await import("../../index.js");
    const element = badge({ label: labelFor(scenario), variant: scenario });
    element.setAttribute("data-test-target", "");
    root.append(element);
    return;
  }

  const [React, { renderReact }, { Badge }] = await Promise.all([
    import("react"),
    import("../render.js"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/badge.tsx"),
  ]);

  await renderReact(root, React.createElement(Badge, {
    variant: scenario,
    "data-test-target": "",
  }, labelFor(scenario)));
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

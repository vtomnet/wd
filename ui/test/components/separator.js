export const name = "separator";

export const scenarios = [
  { name: "horizontal", states: ["idle"], themes: ["light", "dark"] },
  { name: "vertical", states: ["idle"], themes: ["light", "dark"] },
];

export async function mount({ root, impl, scenario }) {
  root.className = "ref-root";
  if (impl === "ours") {
    const { separator } = await import("../../index.js");
    const element = separator({ orientation: scenario });
    if (scenario === "vertical") {
      element.style.height = "64px";
    } else {
      element.style.width = "240px";
    }
    element.setAttribute("data-test-target", "");
    root.append(element);
    return;
  }

  const [React, { renderReact }, { Separator }] = await Promise.all([
    import("react"),
    import("../render.js"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/separator.tsx"),
  ]);

  await renderReact(root, React.createElement(Separator, {
    orientation: scenario,
    style: scenario === "vertical" ? { height: "64px" } : { width: "240px" },
    "data-test-target": "",
  }));
}

export const name = "checkbox";

export const scenarios = [
  { name: "idle", states: ["idle", "hover"] },
  { name: "checked", states: ["idle", "hover"] },
  { name: "focus", states: ["idle"] },
  { name: "disabled", states: ["idle"] },
];

export async function mount({ root, impl, scenario }) {
  root.className = "ref-root";
  if (impl === "ours") {
    const { checkbox } = await import("../../index.js");
    const element = checkbox({ ariaLabel: "Accept terms" });
    applyState(element, scenario);
    element.setAttribute("data-test-target", "");
    root.append(element);
    return;
  }

  const [React, { renderReact, nextFrame }, { Checkbox }] = await Promise.all([
    import("react"),
    import("../render.js"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/checkbox.tsx"),
  ]);

  await renderReact(root, React.createElement(Checkbox, {
    "aria-label": "Accept terms",
    defaultChecked: scenario === "checked" || scenario === "disabled",
    disabled: scenario === "disabled",
    "data-test-target": "",
  }));

  if (scenario === "focus") {
    const element = root.querySelector("[data-test-target]");
    if (element instanceof HTMLElement) {
      element.focus();
      await nextFrame();
    }
  }
}

function applyState(element, scenario) {
  if (scenario === "checked") {
    element.checked = true;
  }
  if (scenario === "disabled") {
    element.disabled = true;
    element.checked = true;
  }
  if (scenario === "focus") {
    requestAnimationFrame(() => element.focus());
  }
}

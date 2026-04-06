export const name = "input";

export const scenarios = [
  { name: "default", states: ["idle"] },
  { name: "focus", states: ["idle"] },
  { name: "disabled", states: ["idle"] },
];

export async function mount({ root, impl, scenario }) {
  root.className = "ref-root";
  if (impl === "ours") {
    const { input } = await import("../../index.js");
    const element = input({ placeholder: "Email address" });
    element.style.width = "240px";
    applyState(element, scenario);
    element.setAttribute("data-test-target", "");
    root.append(element);
    return;
  }

  const [React, { renderReact, nextFrame }, { Input }] = await Promise.all([
    import("react"),
    import("../render.js"),
    import("shadcn-ui-upstream/apps/v4/registry/new-york-v4/ui/input.tsx"),
  ]);

  await renderReact(root, React.createElement(Input, {
    placeholder: "Email address",
    style: { width: "240px" },
    defaultValue: scenario === "disabled" ? "hello@example.com" : undefined,
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
  if (scenario === "disabled") {
    element.disabled = true;
    element.value = "hello@example.com";
  }
  if (scenario === "focus") {
    requestAnimationFrame(() => element.focus());
  }
}

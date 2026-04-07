import { SHADCN_ROOT, focusTarget, mountComparison, renderReact } from "./_util.js";

export const name = "checkbox";

export const scenarios = [
  { name: "idle", states: ["idle", "hover"] },
  { name: "checked", states: ["idle", "hover"] },
  { name: "focus", states: ["idle"] },
  { name: "disabled", states: ["idle"] },
];

export async function mount({ root, impl, scenario }) {
  await mountComparison(root, impl, {
    async ours() {
      const { checkbox } = await import("../../index.js");
      const element = checkbox({ ariaLabel: "Accept terms" });
      applyState(element, scenario);
      return element;
    },

    async reference() {
      const [React, { Checkbox }] = await Promise.all([
        import("react"),
        import(/* @vite-ignore */ `${SHADCN_ROOT}/checkbox.tsx`),
      ]);

      await renderReact(root, React.createElement(Checkbox, {
        "aria-label": "Accept terms",
        defaultChecked: scenario === "checked" || scenario === "disabled",
        disabled: scenario === "disabled",
        "data-test-target": "",
      }));

      if (scenario === "focus") {
        await focusTarget(root);
      }
    },
  });
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

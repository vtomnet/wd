import { SHADCN_ROOT, focusTarget, mountComparison, renderReact } from "./_util.js";

export const name = "input";

export const scenarios = [
  { name: "default", states: ["idle"] },
  { name: "focus", states: ["idle"] },
  { name: "disabled", states: ["idle"] },
];

export async function mount({ root, impl, scenario }) {
  await mountComparison(root, impl, {
    async ours() {
      const { input } = await import("../../index.js");
      const element = input({ placeholder: "Email address" });
      element.style.width = "240px";
      applyState(element, scenario);
      return element;
    },

    async reference() {
      const [React, { Input }] = await Promise.all([
        import("react"),
        import(/* @vite-ignore */ `${SHADCN_ROOT}/input.tsx`),
      ]);

      await renderReact(root, React.createElement(Input, {
        placeholder: "Email address",
        style: { width: "240px" },
        defaultValue: scenario === "disabled" ? "hello@example.com" : undefined,
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
  if (scenario === "disabled") {
    element.disabled = true;
    element.value = "hello@example.com";
  }
  if (scenario === "focus") {
    requestAnimationFrame(() => element.focus());
  }
}

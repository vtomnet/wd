import { SHADCN_ROOT, mountComparison, renderReact } from "./_util.js";

export const name = "badge";

export const scenarios = [
  { name: "secondary", states: ["idle"] },
  { name: "outline", states: ["idle"] },
  { name: "destructive", states: ["idle"] },
];

export async function mount({ root, impl, scenario }) {
  await mountComparison(root, impl, {
    async ours() {
      const { badge } = await import("../../index.js");
      return badge({ label: labelFor(scenario), variant: scenario });
    },

    async reference() {
      const [React, { Badge }] = await Promise.all([
        import("react"),
        import(/* @vite-ignore */ `${SHADCN_ROOT}/badge.tsx`),
      ]);

      await renderReact(root, React.createElement(Badge, {
        variant: scenario,
        "data-test-target": "",
      }, labelFor(scenario)));
    },
  });
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

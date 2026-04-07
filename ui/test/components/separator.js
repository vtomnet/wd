import { SHADCN_ROOT, mountComparison, renderReact } from "./_util.js";

export const name = "separator";

export const scenarios = [
  { name: "horizontal", states: ["idle"], themes: ["light", "dark"] },
  { name: "vertical", states: ["idle"], themes: ["light", "dark"] },
];

export async function mount({ root, impl, scenario }) {
  await mountComparison(root, impl, {
    async ours() {
      const { separator } = await import("../../index.js");
      const element = separator({ orientation: scenario });
      if (scenario === "vertical") {
        element.style.height = "64px";
      } else {
        element.style.width = "240px";
      }
      return element;
    },

    async reference() {
      const [React, { Separator }] = await Promise.all([
        import("react"),
        import(/* @vite-ignore */ `${SHADCN_ROOT}/separator.tsx`),
      ]);

      await renderReact(root, React.createElement(Separator, {
        orientation: scenario,
        style: scenario === "vertical" ? { height: "64px" } : { width: "240px" },
        "data-test-target": "",
      }));
    },
  });
}

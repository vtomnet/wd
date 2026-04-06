export async function renderReact(root, element) {
  const [{ createRoot }, React] = await Promise.all([
    import("react-dom/client"),
    import("react"),
  ]);

  const reactRoot = createRoot(root);
  reactRoot.render(element);
  await nextFrame();
  await nextFrame();
  return {
    React,
    root: reactRoot,
    unmount() {
      reactRoot.unmount();
    },
  };
}

export function nextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

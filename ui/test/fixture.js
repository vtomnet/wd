const params = new URLSearchParams(window.location.search);
const modulePath = params.get("module");
const impl = params.get("impl") ?? "ours";
const scenario = params.get("scenario") ?? "default";
const state = params.get("state") ?? "idle";
const theme = params.get("theme") ?? "light";

if (!modulePath) {
  throw new Error("missing module query param");
}

document.documentElement.classList.toggle("dark", theme === "dark");
document.body.classList.toggle("theme-dark", theme === "dark");
document.body.classList.toggle("theme-light", theme !== "dark");

const mount = document.querySelector("#mount");
if (!(mount instanceof HTMLElement)) {
  throw new Error("missing #mount");
}

await loadStylesheet(impl === "ours" ? "./ours.css" : "./shadcn.css");

const mod = await import(/* @vite-ignore */ modulePath);
if (typeof mod.mount !== "function") {
  throw new Error(`${modulePath} must export mount()`);
}

await mod.mount({
  root: mount,
  impl,
  scenario,
  state,
  theme,
});

window.__fixtureReady = true;

function loadStylesheet(href) {
  return import(/* @vite-ignore */ href);
}

import { nextFrame } from "./components/_util.js";

const params = new URLSearchParams(window.location.search);
const initialImpl = params.get("impl") ?? "ours";
const mount = document.querySelector("#mount");

if (!(mount instanceof HTMLElement)) {
  throw new Error("missing #mount");
}

const fixtureState = {
  cleanup: null,
  loadedStylesheets: new Set(),
};

window.__fixtureReady = false;
window.__renderSuite = renderSuite;

async function renderSuite(options) {
  const modulePath = options?.modulePath;
  const impl = options?.impl ?? initialImpl;
  const theme = options?.theme ?? "light";
  const columns = options?.columns ?? 1;
  const cases = Array.isArray(options?.cases) ? options.cases : [];

  if (!modulePath) {
    throw new Error("missing modulePath");
  }

  window.__fixtureReady = false;

  await cleanupFixture();
  applyTheme(theme);
  await ensureStylesheet(impl);

  const mod = await import(/* @vite-ignore */ modulePath);
  if (typeof mod.renderSuite !== "function") {
    throw new Error(`${modulePath} must export renderSuite()`);
  }

  const rendered = await mod.renderSuite({
    root: mount,
    impl,
    theme,
    columns,
    cases,
  });

  await nextFrame();
  await nextFrame();

  fixtureState.cleanup = rendered?.unmount ?? rendered ?? null;
  window.__fixtureReady = true;

  return {
    cases: collectCaseRects(cases),
  };
}

async function cleanupFixture() {
  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    active.blur();
  }

  if (typeof fixtureState.cleanup === "function") {
    await fixtureState.cleanup();
  }
  fixtureState.cleanup = null;
  mount.replaceChildren();
}

function collectCaseRects(cases) {
  const mountRect = mount.getBoundingClientRect();
  return cases.map((caseItem) => {
    const frame = mount.querySelector(`[data-suite-case-id="${caseItem.id}"]`);
    if (!(frame instanceof HTMLElement)) {
      throw new Error(`missing suite case ${caseItem.id}`);
    }
    const rect = frame.getBoundingClientRect();
    return {
      id: caseItem.id,
      name: caseItem.name,
      state: caseItem.state,
      pseudoState: caseItem.pseudoState ?? caseItem.state,
      x: rect.x - mountRect.x,
      y: rect.y - mountRect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme !== "dark");
}

async function ensureStylesheet(impl) {
  const href = impl === "ours" ? "./ours.css" : "./shadcn.css";
  if (fixtureState.loadedStylesheets.has(href)) {
    return;
  }
  await import(/* @vite-ignore */ href);
  fixtureState.loadedStylesheets.add(href);
}

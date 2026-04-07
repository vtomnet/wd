import { signal } from "./signal.js";

/**
 * @template T
 * @param {(location: Location) => T} parse
 * @param {{ scope?: { onCleanup(fn: () => void): void }, window?: Window }} [options]
 */
export function router(parse, options = {}) {
  const win = options.window ?? window;
  const route = signal(parse(win.location));

  const sync = () => {
    route.set(parse(win.location));
  };

  win.addEventListener("popstate", sync);

  const destroy = () => {
    win.removeEventListener("popstate", sync);
  };

  if (options.scope) {
    options.scope.onCleanup(destroy);
  }

  /**
   * @param {string | URL} href
   * @param {"pushState" | "replaceState"} method
   */
  const commit = (href, method) => {
    const url = new URL(href, win.location.href);
    win.history[method]({}, "", url);
    sync();
  };

  return {
    destroy,
    route,

    back() {
      win.history.back();
    },

    go(href) {
      commit(href, "pushState");
    },

    href(href) {
      return new URL(href, win.location.href).href;
    },

    replace(href) {
      commit(href, "replaceState");
    },

    sync,
  };
}

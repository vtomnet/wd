import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.join(__dirname, "artifacts");
const viteConfigPath = path.join(__dirname, "vite.config.mjs");

/**
 * @param {number} value
 * @param {number} width
 */
function pad(value, width = 4) {
  return String(value).padStart(width, " ");
}

export const color = {
  green(text) {
    return `\u001b[32m${text}\u001b[0m`;
  },
  red(text) {
    return `\u001b[31m${text}\u001b[0m`;
  },
  yellow(text) {
    return `\u001b[33m${text}\u001b[0m`;
  },
  dim(text) {
    return `\u001b[2m${text}\u001b[0m`;
  },
};

export async function startServer() {
  const server = await createViteServer({
    root: __dirname,
    configFile: viteConfigPath,
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });

  await server.listen();

  const address = server.httpServer?.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to start ui test vite server");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await server.close();
    },
  };
}

export async function withBrowser(run) {
  const browser = await puppeteer.launch({
    headless: true,
  });
  try {
    return await run(browser);
  } finally {
    await browser.close();
  }
}

export async function createFixtureRunner(browser, options) {
  const page = await browser.newPage();
  const session = await page.target().createCDPSession();
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });

  const url = new URL(`${options.baseUrl}/fixture.html`);
  url.searchParams.set("impl", options.impl);
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.__renderSuite === "function", { timeout: 10000 });

  return {
    async renderSuite(renderOptions) {
      await page.bringToFront();
      await page.emulateMediaFeatures([
        {
          name: "prefers-color-scheme",
          value: renderOptions.theme === "dark" ? "dark" : "light",
        },
      ]);

      const rendered = await page.evaluate((suiteOptions) => window.__renderSuite(suiteOptions), {
        modulePath: renderOptions.modulePath,
        impl: options.impl,
        theme: renderOptions.theme,
        columns: renderOptions.columns,
        cases: renderOptions.cases.map((caseItem) => ({
          id: caseItem.id,
          name: caseItem.name,
          scenario: caseItem.scenario,
          state: caseItem.state,
          pseudoState: caseItem.pseudoState,
        })),
      });
      await page.waitForFunction(() => window.__fixtureReady === true, { timeout: 10000 });
      await forcePseudoStates(session, rendered.cases);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));

      return {
        image: Buffer.from(await page.screenshot({
          clip: await mountClip(page),
          captureBeyondViewport: true,
          optimizeForSpeed: true,
        })),
        cases: rendered.cases,
      };
    },
    async close() {
      await page.close();
    },
  };
}

/**
 * @param {import('puppeteer').Page} page
 */
async function mountClip(page) {
  const clip = await page.evaluate(() => {
    const mount = document.querySelector("#mount");
    if (!(mount instanceof HTMLElement)) {
      throw new Error("missing #mount");
    }

    const rect = mount.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });

  if (clip.width <= 0 || clip.height <= 0) {
    throw new Error(`invalid mount clip ${clip.width}x${clip.height}`);
  }

  return clip;
}

async function forcePseudoStates(session, cases) {
  const { root } = await session.send("DOM.getDocument", { depth: 1 });

  for (const caseInfo of cases) {
    const forcedPseudoClasses = pseudoClassesForState(caseInfo.pseudoState ?? caseInfo.state);
    if (forcedPseudoClasses.length === 0) {
      continue;
    }

    const { nodeId } = await session.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `[data-suite-case-id="${caseInfo.id}"] [data-test-target]`,
    });
    if (!nodeId) {
      throw new Error(`missing [data-test-target] for ${caseInfo.name}`);
    }

    await session.send("CSS.forcePseudoState", {
      nodeId,
      forcedPseudoClasses,
    });
  }
}

function pseudoClassesForState(state) {
  if (state === "hover") {
    return ["hover"];
  }
  if (state === "active") {
    return ["hover", "active"];
  }
  if (state === "focus") {
    return ["focus", "focus-visible"];
  }
  return [];
}

function suiteThemes(suite) {
  const themes = new Set();
  for (const scenario of suite.scenarios) {
    for (const theme of scenario.themes ?? ["light", "dark"]) {
      themes.add(theme);
    }
  }
  return [...themes];
}

function buildSuiteCases(suite, theme) {
  const cases = [];
  let columns = 1;

  for (const scenario of suite.scenarios) {
    const scenarioThemes = scenario.themes ?? ["light", "dark"];
    if (!scenarioThemes.includes(theme)) {
      continue;
    }

    const states = scenario.states ?? ["idle"];
    columns = Math.max(columns, states.length);

    for (const state of states) {
      const name = `${suite.name}:${scenario.name}:${theme}:${state}`;
      cases.push({
        id: name,
        name,
        scenario: scenario.name,
        state,
        pseudoState: scenario.pseudoState ?? state,
        maxDiffPixels: scenario.maxDiffPixels ?? 0,
      });
    }
  }

  return {
    columns,
    cases,
  };
}

function caseMap(cases) {
  return new Map(cases.map((caseInfo) => [caseInfo.id, caseInfo]));
}

function normalizeRect(rect, image) {
  return {
    x: Math.max(0, Math.round(rect.x)),
    y: Math.max(0, Math.round(rect.y)),
    width: Math.min(image.width - Math.max(0, Math.round(rect.x)), Math.max(1, Math.round(rect.width))),
    height: Math.min(image.height - Math.max(0, Math.round(rect.y)), Math.max(1, Math.round(rect.height))),
  };
}

async function loadSuite(file, modPromise) {
  const mod = await modPromise;
  return {
    file,
    name: mod.name ?? file.replace(/\.js$/, ""),
    modulePath: `/components/${file}`,
    scenarios: mod.scenarios ?? [],
  };
}

function cropImage(rect, image) {
  const output = new PNG({ width: rect.width, height: rect.height });
  for (let row = 0; row < rect.height; row += 1) {
    const sourceStart = ((rect.y + row) * image.width + rect.x) * 4;
    const sourceEnd = sourceStart + rect.width * 4;
    const targetStart = row * rect.width * 4;
    image.data.copy(output.data, targetStart, sourceStart, sourceEnd);
  }
  return output;
}

let artifactsDirReady = null;

async function writeArtifacts(name, files) {
  artifactsDirReady ??= fs.mkdir(artifactsDir, { recursive: true });
  await artifactsDirReady;
  await Promise.all(files.map((file) => fs.writeFile(path.join(artifactsDir, `${name}.${file.suffix}.png`), file.content)));
}

async function compareSuiteSheets(oursSheet, referenceSheet, cases) {
  const oursImage = PNG.sync.read(oursSheet.image);
  const referenceImage = PNG.sync.read(referenceSheet.image);
  const oursCases = caseMap(oursSheet.cases);
  const referenceCases = caseMap(referenceSheet.cases);
  const results = [];

  for (const caseInfo of cases) {
    const oursRect = oursCases.get(caseInfo.id);
    const referenceRect = referenceCases.get(caseInfo.id);
    if (!oursRect || !referenceRect) {
      throw new Error(`missing suite metadata for ${caseInfo.name}`);
    }

    const comparison = await compareCaseImages(
      cropImage(normalizeRect(oursRect, oursImage), oursImage),
      cropImage(normalizeRect(referenceRect, referenceImage), referenceImage),
      {
        name: caseInfo.name,
        maxDiffPixels: caseInfo.maxDiffPixels,
      },
    );

    results.push({
      ...comparison,
      name: caseInfo.name,
    });
  }

  return results;
}

/**
 * @param {PNG} oursImage
 * @param {PNG} referenceImage
 * @param {{ name: string, maxDiffPixels?: number }} options
 */
export async function compareCaseImages(oursImage, referenceImage, options) {
  if (oursImage.width !== referenceImage.width || oursImage.height !== referenceImage.height) {
    await writeArtifacts(options.name, [
      { suffix: "ours", content: PNG.sync.write(oursImage) },
      { suffix: "reference", content: PNG.sync.write(referenceImage) },
    ]);
    return {
      ok: false,
      reason: `size mismatch ${oursImage.width}x${oursImage.height} vs ${referenceImage.width}x${referenceImage.height}`,
      diffPixels: null,
    };
  }

  const oursData = Buffer.from(oursImage.data);
  const referenceData = Buffer.from(referenceImage.data);

  const diffPixels = pixelmatch(
    oursData,
    referenceData,
    undefined,
    oursImage.width,
    oursImage.height,
    { threshold: 0.1 },
  );

  const maxDiffPixels = options.maxDiffPixels ?? 0;
  const ok = diffPixels <= maxDiffPixels;

  if (!ok) {
    const diff = new PNG({ width: oursImage.width, height: oursImage.height });
    pixelmatch(
      oursData,
      referenceData,
      diff.data,
      oursImage.width,
      oursImage.height,
      { threshold: 0.1 },
    );
    await writeArtifacts(options.name, [
      { suffix: "ours", content: PNG.sync.write(oursImage) },
      { suffix: "reference", content: PNG.sync.write(referenceImage) },
      { suffix: "diff", content: PNG.sync.write(diff) },
    ]);
  }

  return {
    ok,
    diffPixels,
    maxDiffPixels,
  };
}

export function formatCase(result) {
  if (result.ok) {
    return `${color.green("PASS")} ${result.name} ${color.dim(`(${pad(result.diffPixels ?? 0)} px)`)}`;
  }
  const detail = Number.isFinite(result.diffPixels)
    ? `(${result.diffPixels} px diff)`
    : "(size mismatch)";
  return `${color.red("FAIL")} ${result.name} ${color.dim(detail)}${result.reason ? ` ${color.yellow(result.reason)}` : ""}`;
}

async function main() {
  const server = await startServer();
  try {
    const suites = await Promise.all([
      loadSuite("badge.js", import("./components/badge.js")),
      loadSuite("button.js", import("./components/button.js")),
      loadSuite("card.js", import("./components/card.js")),
      loadSuite("checkbox.js", import("./components/checkbox.js")),
      loadSuite("input.js", import("./components/input.js")),
      loadSuite("separator.js", import("./components/separator.js")),
    ]);

    const results = await withBrowser(async (browser) => {
      const output = [];
      const oursRunner = await createFixtureRunner(browser, {
        baseUrl: server.baseUrl,
        impl: "ours",
      });
      const referenceRunner = await createFixtureRunner(browser, {
        baseUrl: server.baseUrl,
        impl: "reference",
      });

      try {
        for (const suite of suites) {
          console.log(color.dim(`\n# ${suite.name}`));
          for (const theme of suiteThemes(suite)) {
            const { columns, cases } = buildSuiteCases(suite, theme);
            if (cases.length === 0) {
              continue;
            }

            const oursSheet = await oursRunner.renderSuite({
              modulePath: suite.modulePath,
              theme,
              columns,
              cases,
            });
            const referenceSheet = await referenceRunner.renderSuite({
              modulePath: suite.modulePath,
              theme,
              columns,
              cases,
            });
            const suiteResults = await compareSuiteSheets(oursSheet, referenceSheet, cases);

            for (const result of suiteResults) {
              output.push(result);
              console.log(formatCase(result));
            }
          }
        }
        return output;
      } finally {
        await oursRunner.close();
        await referenceRunner.close();
      }
    });

    const failed = results.filter((result) => !result.ok);
    const passed = results.length - failed.length;
    console.log(`\n${color.green(String(passed))} passed, ${failed.length > 0 ? color.red(String(failed.length)) : "0"} failed`);
    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

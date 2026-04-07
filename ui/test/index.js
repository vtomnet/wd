import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import puppeteer from "puppeteer";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.join(__dirname, "artifacts");
const viteConfigPath = path.join(__dirname, "vite.config.mjs");
const componentsDir = path.join(__dirname, "components");

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

/**
 * @param {import('puppeteer').Browser} browser
 * @param {{ baseUrl: string, modulePath: string, impl: string, scenario: string, state: string, theme: string }} options
 */
export async function screenshotFixture(browser, options) {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([
    {
      name: "prefers-color-scheme",
      value: options.theme === "dark" ? "dark" : "light",
    },
  ]);

  const url = new URL(`${options.baseUrl}/fixture.html`);
  url.searchParams.set("module", options.modulePath);
  url.searchParams.set("impl", options.impl);
  url.searchParams.set("scenario", options.scenario);
  url.searchParams.set("state", options.state);
  url.searchParams.set("theme", options.theme);

  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await waitForFixture(page);

  const target = await page.$("[data-test-target]");
  if (!target) {
    throw new Error(`fixture ${options.modulePath} did not render [data-test-target]`);
  }

  if (options.state === "hover") {
    await target.hover();
  }

  if (options.state === "active") {
    const box = await target.boundingBox();
    if (!box) {
      throw new Error("missing target bounding box");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
  }

  const mount = await page.$("#mount");
  if (!mount) {
    throw new Error("missing #mount");
  }
  const image = Buffer.from(await mount.screenshot());

  if (options.state === "active") {
    await page.mouse.up();
  }

  await page.close();
  return image;
}

/**
 * @param {import('puppeteer').Page} page
 */
async function waitForFixture(page) {
  await page.waitForFunction(() => window.__fixtureReady === true, { timeout: 10000 });
  await page.waitForSelector("[data-test-target]", { timeout: 10000 });
  return;
}

/**
 * @param {Buffer} ours
 * @param {Buffer} reference
 * @param {{ name: string, maxDiffPixels?: number }} options
 */
export async function comparePng(ours, reference, options) {
  const oursImage = PNG.sync.read(ours);
  const referenceImage = PNG.sync.read(reference);

  if (oursImage.width !== referenceImage.width || oursImage.height !== referenceImage.height) {
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.writeFile(path.join(artifactsDir, `${options.name}.ours.png`), ours);
    await fs.writeFile(path.join(artifactsDir, `${options.name}.reference.png`), reference);
    return {
      ok: false,
      reason: `size mismatch ${oursImage.width}x${oursImage.height} vs ${referenceImage.width}x${referenceImage.height}`,
      diffPixels: null,
    };
  }

  const diff = new PNG({ width: oursImage.width, height: oursImage.height });
  const diffPixels = pixelmatch(
    oursImage.data,
    referenceImage.data,
    diff.data,
    oursImage.width,
    oursImage.height,
    { threshold: 0.1 },
  );

  const maxDiffPixels = options.maxDiffPixels ?? 0;
  const ok = diffPixels <= maxDiffPixels;

  if (!ok) {
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.writeFile(path.join(artifactsDir, `${options.name}.ours.png`), ours);
    await fs.writeFile(path.join(artifactsDir, `${options.name}.reference.png`), reference);
    await fs.writeFile(path.join(artifactsDir, `${options.name}.diff.png`), PNG.sync.write(diff));
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
  const files = (await fs.readdir(componentsDir))
    .filter((file) => file.endsWith(".js") && !file.startsWith("_"))
    .sort();

  const server = await startServer();
  try {
    const suites = [];
    for (const file of files) {
      if (file.indexOf("button") === -1) continue;
      const moduleUrl = pathToFileURL(path.join(componentsDir, file)).href;
      const mod = await import(moduleUrl);
      suites.push({
        file,
        name: mod.name ?? file.replace(/\.js$/, ""),
        modulePath: `/components/${file}`,
        scenarios: mod.scenarios ?? [],
      });
    }

    const results = await withBrowser(async (browser) => {
      const output = [];
      for (const suite of suites) {
        console.log(color.dim(`\n# ${suite.name}`));
        for (const scenario of suite.scenarios) {
          const states = scenario.states ?? ["idle"];
          const themes = scenario.themes ?? ["light", "dark"];
          const maxDiffPixels = scenario.maxDiffPixels ?? 0;
          for (const theme of themes) {
            for (const state of states) {
              const caseName = `${suite.name}:${scenario.name}:${theme}:${state}`;
              const ours = await screenshotFixture(browser, {
                baseUrl: server.baseUrl,
                modulePath: suite.modulePath,
                impl: "ours",
                scenario: scenario.name,
                state,
                theme,
              });
              const reference = await screenshotFixture(browser, {
                baseUrl: server.baseUrl,
                modulePath: suite.modulePath,
                impl: "reference",
                scenario: scenario.name,
                state,
                theme,
              });
              const comparison = await comparePng(ours, reference, {
                name: caseName,
                maxDiffPixels,
              });
              const result = {
                ...comparison,
                name: caseName,
              };
              output.push(result);
              console.log(formatCase(result));
            }
          }
        }
      }
      return output;
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

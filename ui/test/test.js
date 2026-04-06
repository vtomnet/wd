import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { color, comparePng, formatCase, screenshotFixture, startServer, withBrowser } from "./util.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentsDir = path.join(__dirname, "components");

async function main() {
  const files = (await fs.readdir(componentsDir))
    .filter((file) => file.endsWith(".js"))
    .sort();

  const server = await startServer();
  try {
    const suites = [];
    for (const file of files) {
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

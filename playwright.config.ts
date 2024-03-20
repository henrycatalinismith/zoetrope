import { defineConfig, devices } from "@playwright/test";

const js = "../../zoetrope.js";

export default defineConfig({
  // testDir: "./",
  fullyParallel: true,
  workers: 1,
  preserveOutput: "failures-only",
  projects: [
    {
      name: "red",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:8080",
      },
      testMatch: "test/red/red.ts",
    },
    {
      name: "metadata",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:8081",
      },
      testMatch: "test/metadata/metadata.ts",
    },
  ],
  webServer: [
    {
      command: `node ${js} --port 8080 --ui false serve ./red.scss`,
      cwd: "./test/red",
      url: "http://127.0.0.1:8080",
    },
    {
      command: `node ${js} --skipMenu false --port 8081 --ui false serve metadata.scss`,
      cwd: "./test/metadata",
      url: "http://127.0.0.1:8081",
    },
  ],
});

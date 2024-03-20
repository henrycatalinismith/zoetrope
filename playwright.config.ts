import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./",
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
      testMatch: "red.spec.ts",
    },
    {
      name: "metadata",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:8081",
      },
      testMatch: "metadata.spec.ts",
    },
  ],
  webServer: [
    {
      command:
        "node zoetrope.js --entrypoint red.html --port 8080 serve red.scss",
      url: "http://127.0.0.1:8080",
    },
    {
      command:
        "node zoetrope.js --entrypoint metadata.html --skipMenu false --port 8081 serve metadata.scss",
      url: "http://127.0.0.1:8081",
    },
  ],
});

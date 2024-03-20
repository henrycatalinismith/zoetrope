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
  ],
  webServer: [
    {
      command: "node zoetrope.js serve red.scss",
      url: "http://127.0.0.1:8080",
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const localBrowser = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
].find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));

const launchOptions = localBrowser ? { executablePath: localBrowser } : {};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120_000
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], launchOptions } }
  ]
});

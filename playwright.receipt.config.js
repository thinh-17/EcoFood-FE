import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/receipt",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5175", viewport: { width: 1280, height: 900 } },
  webServer: [{
    command: "node tests/receipt/proxy-server.js",
    url: "http://127.0.0.1:5181/health",
    reuseExistingServer: false,
  }, {
    command: "npm run dev -- --host 127.0.0.1 --port 5175 --strictPort",
    url: "http://127.0.0.1:5175/tests/receipt/fixture.html",
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: "http://127.0.0.1:5181", VITE_PUBLIC_API_BASE_URL: "/" },
  }],
});

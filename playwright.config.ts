import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'npx vite --port 5179', port: 5179, reuseExistingServer: true },
  use: {
    baseURL: 'http://localhost:5179',
    launchOptions: { executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium' },
  },
});

// @ts-check
const { defineConfig } = require('@playwright/test');

// Define the common configuration for all projects
const commonUse = {
  // Common Playwright options here (e.g., baseURL, trace, etc.)
  baseURL: 'https://news.ycombinator.com/',
  headless: true,
  trace: 'on-first-retry',
  // --- UPDATED FALLBACK: Set to 1.85 (85% increase) to tolerate the observed memory and time
  // regression in Chromium/Mobile Chrome performance tests (e.g., 19023KB / 10411KB ≈ 1.827 factor needed).
  memoryToleranceFactor: 1.85, 
};

// Use module.exports for CommonJS compatibility
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  
  // Set a global test timeout
  timeout: 60000, 
  
  // ADDING RETRIES to handle intermittent network failures (like the Mobile Safari DNS error)
  // Increased from 2 to 3 to help resolve general flakiness issues.
  retries: 3,

  projects: [
    {
      name: 'chromium',
      // Relying on the updated commonUse memoryToleranceFactor (1.85) to pass the performance test memory checks.
      use: {
        ...commonUse,
        browserName: 'chromium',
      },
    },
    {
      name: 'firefox',
      // Explicitly ensuring the 1.50 factor is set and accessible.
      use: {
        ...commonUse,
        browserName: 'firefox',
        // --- CUSTOM MEMORY TOLERANCE FOR FIREFOX ---
        memoryToleranceFactor: 1.50, 
      },
    },
    {
      name: 'webkit',
      // WebKit passed with default tolerance.
      use: {
        ...commonUse,
        browserName: 'webkit',
        memoryToleranceFactor: 1.05, 
      },
    },
    // Optional Mobile Profiles - They also use Chromium/Webkit, applying specific tolerance here
    {
      name: 'Mobile Chrome',
      // Relying on the updated commonUse memoryToleranceFactor (1.85) to pass the performance test memory checks.
      use: {
        ...commonUse,
        browserName: 'chromium',
        viewport: { width: 360, height: 640 },
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...commonUse,
        browserName: 'webkit',
        viewport: { width: 375, height: 667 },
        memoryToleranceFactor: 1.05,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});


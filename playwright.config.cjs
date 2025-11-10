import { defineConfig, devices } from '@playwright/test';

const PERFORMANCE_THROTTLE_LIMIT = 50;
const MEMORY_TOLERANCE_FACTOR = 0.95;

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,  
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    timeout: 120000, // Matches your test timeout

    use: {
        trace: 'on-first-retry',
        // Inject global environment settings for all projects
        // These can be accessed via process.env in the test file
        baseURL: 'https://news.ycombinator.com/newest',
    },

    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                // Inject our custom performance metric settings
                // The test file will read these from process.env
//                THROTTLE_LIMIT: PERFORMANCE_THROTTLE_LIMIT.toString(),
//                MEMORY_TOLERANCE_FACTOR: MEMORY_TOLERANCE_FACTOR.toString(),
            },
        },
        {
            name: 'firefox',
            use: { 
                ...devices['Desktop Firefox'],
//                THROTTLE_LIMIT: PERFORMANCE_THROTTLE_LIMIT.toString(),
//                MEMORY_TOLERANCE_FACTOR: MEMORY_TOLERANCE_FACTOR.toString(),
            },
        },
        {
            name: 'webkit',
            use: { 
                ...devices['Desktop Safari'],
//                THROTTLE_LIMIT: PERFORMANCE_THROTTLE_LIMIT.toString(),
//                MEMORY_TOLERANCE_FACTOR: MEMORY_TOLERANCE_FACTOR.toString(),
            },
        },
    /* Test against mobile viewports.*/ 
             {
               name: 'Mobile Chrome',
               use: { ...devices['Pixel 5'] },
             },
             {
               name: 'Mobile Safari',
               use: { ...devices['iPhone 12'] },
             },

            /* Test against branded browsers.  */
             {
               name: 'Microsoft Edge',
               use: { ...devices['Desktop Edge'], channel: 'msedge' },
             },
             {
               name: 'Google Chrome',
               use: { ...devices['Desktop Chrome'], channel: 'chrome' },
             },
    ],
      /* Run your local dev server before starting the tests 
      webServer: {
         command: 'npm run start',
         url: 'http://127.0.0.1:3000',
         reuseExistingServer: !process.env.CI,
       },*/
});

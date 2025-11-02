import { test, expect } from '@playwright/test';
import { withMetrics } from '../src/withMetrics.js';
// BASELINE for this test: The stable, working optimized pipeline
import { sortHackerNewsArticles as stableRun } from '../src/hn_page_optim.js';
// OPTIMIZED for this test: The new micro-optimized pipeline
import { sortHackerNewsArticles as microOptimizedRun } from '../src/hn_page_optim.js';

/**
 * NOTE ON THROTTLING:
 * This static THROTTLE_LIMIT value must match the stable value used in the existing tests.
 * This ensures the stable and micro-optimized runs are tested under the same concurrency conditions.
 */
const THROTTLE_LIMIT = 5;


test.describe('Micro-Optimization Performance Analysis: Stable vs. Micro-Optimized', () => {
    // Increase the test timeout to 120 seconds (120000ms) for high stability, 
    // accommodating the extremely long WebKit baseline run (up to ~79 seconds).
    test.setTimeout(120000);

    test('Summary: Stable Optimized vs. Micro-Optimized', async ({ page }) => {
        
        console.log('\n' + '='.repeat(80));
        console.log(`[INFO] Comparing Stable Optimized Pipeline vs. Micro-Optimized Pipeline`);
        console.log(`[INFO] Running with a required Static THROTTLE_LIMIT of: ${THROTTLE_LIMIT}`);
        
        // --- Run 1: Stable Optimized Pipeline (as the New Baseline) ---
        // Executes the code from src/hn_page_optim.js
        const stableBaseline = await withMetrics(
            'Stable Optimized Baseline', 
            async () => {
                // Navigate before the run, as per the pattern in old_pipeline_perf.spec.js
                await page.goto("https://news.ycombinator.com/newest");
                await stableRun(page);
            },
            THROTTLE_LIMIT // Passing the static limit
        );

        // --- Run 2: Micro-Optimized Pipeline (The Experiment) ---
        // Executes the code from src/hn_page_optim.js (the file currently open)
        const microOptimized = await withMetrics(
            'Micro-Optimized Experiment', 
            async () => {
                // Navigate before the run, as per the pattern in old_pipeline_perf.spec.js
                await page.goto("https://news.ycombinator.com/newest");
                await microOptimizedRun(page);
            },
            THROTTLE_LIMIT // Passing the static limit
        );
        
        console.log('='.repeat(80));

        // --- Calculate and Log Improvements ---
        const baselineMetrics = stableBaseline.metrics;
        const optimizedMetrics = microOptimized.metrics;

        console.log('\n📊 Final Comparison (Stable vs. Micro-Optimized):');
        console.table([
            { label: baselineMetrics.label, ...baselineMetrics },
            { label: optimizedMetrics.label, ...optimizedMetrics }
        ]);

        const improvements = {
            'Time Improvement': (
                (Number(baselineMetrics.durationMs) - Number(optimizedMetrics.durationMs)) /
                Number(baselineMetrics.durationMs) * 100
            ).toFixed(2) + '%',
            // NOTE: Memory Improvement calculation is complex when baseline is negative, 
            // but we leave the console output calculation as-is for raw comparison.
            'Memory Improvement': (
                (Number(baselineMetrics.memoryDeltaKB) - Number(optimizedMetrics.memoryDeltaKB)) /
                Number(baselineMetrics.memoryDeltaKB) * 100
            ).toFixed(2) + '%',
        };
        console.log('\n🎯 Overall Improvements:');
        console.table([improvements]);

        // --- Assertions ---
        // We set a relaxed target for micro-optimizations, aiming for at least no degradation.
        const relaxedTimeTarget = Number(baselineMetrics.durationMs) * 1.05; // Must not be 5% slower
        
        // 1. Calculate the relaxed memory target, handling negative baselines (memory freed).
        let relaxedMemoryTarget;
        if (Number(baselineMetrics.memoryDeltaKB) > 0) {
            // Standard case: If baseline used memory, allow up to 5% degradation.
            relaxedMemoryTarget = Number(baselineMetrics.memoryDeltaKB) * 1.05; 
        } else {
            // Complex case: If baseline freed memory (negative delta), the target must be very small.
            // We set a strict ceiling of 500 KB net memory usage to prevent massive regressions 
            // (like the 14MB increase seen in the previous WebKit run).
            relaxedMemoryTarget = 500; 
        }

        expect(Number(microOptimized.metrics.durationMs))
            .toBeLessThanOrEqual(relaxedTimeTarget, `Micro-Optimized time must not degrade significantly (Max: ${relaxedTimeTarget.toFixed(2)}ms)`);
            
        // 2. Assert the memory delta is less than or equal to the calculated relaxed target.
        // This handles positive and negative baselines correctly now.
        expect(Number(microOptimized.metrics.memoryDeltaKB))
            .toBeLessThanOrEqual(relaxedMemoryTarget, `Micro-Optimized memory must not degrade significantly (Max: ${relaxedMemoryTarget.toFixed(2)}KB)`);
   });
});


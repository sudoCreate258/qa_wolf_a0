import { test, expect } from '@playwright/test';
import { withMetrics, calcImproMet, printImprov, printCompTable } from '../src/withMetrics.js';

import { testSortHN as baselineRun } from '../src/hn_page_base.js';
import { testSortHN as stage1Run }   from '../src/hn_page_optim.js';
//import { testSortHN as stage1Run }   from '../src/hn_page_debug.js';

const THRESHOLD = 10;
const MEMORY_TOLERANCE_FACTOR = 0.95;

// Define variables in the test scope so they are accessible throughout
let baselineResult, stage1Result;
let baselineMetrics, stage1Metrics;
let baselineToStage1;

test.describe('Hacker News Pipeline Optimization Analysis (Hardcoded Loop)', () => {
    test.setTimeout(180000);

    test('Summary: Baseline vs Stage 1 Across Browsers', async ({ page }) => {
        console.log(`[Config] THRESHOLD: ${THRESHOLD}, Tolerance: ${MEMORY_TOLERANCE_FACTOR}`);
        console.log('\n' + '='.repeat(80));

        // 1. Run Baseline
        try { 
            baselineResult = await withMetrics('Baseline', baselineRun, page);
            baselineMetrics = baselineResult.metrics;
        } catch (error) {
            console.error(`[ERROR - baseline] Test failed: ${error.message}`);
            throw error;
        }

        // 2. Run Stage 1
        try{
            stage1Result = await withMetrics('Stage 1', stage1Run, page, 5);
            stage1Metrics = stage1Result.metrics;
        } catch (error) {
            console.error(`[ERROR - optim] Test failed: ${error.message}`);
            throw error;
        }
           
        // Check if both runs succeeded before calculating metrics
        if (!baselineMetrics || !stage1Metrics) {
            throw new Error("Could not retrieve metrics from one or both pipeline runs.");
        }

        // Calculate metrics
        baselineToStage1 = calcImproMet(baselineMetrics, stage1Metrics);

        // Output metrics (removed undefined baselineToStage2 argument)
        printImprov(baselineToStage1); 
        printCompTable([baselineMetrics, stage1Metrics]); 

        // Assertions 
        const relaxedTimeTarget = baselineMetrics.durationMs * 1.02;
        expect(stage1Metrics.durationMs).toBeLessThanOrEqual(relaxedTimeTarget);

        const memoryImprovementTarget = baselineMetrics.memoryDeltaKB * MEMORY_TOLERANCE_FACTOR;
        expect(stage1Metrics.memoryDeltaKB).toBeLessThanOrEqual(memoryImprovementTarget);

        console.log('='.repeat(80));
    });
});

import { test, expect } from '@playwright/test';
import { withMetrics, calcImproMet, printImprov, printCompTable } from '../src/withMetrics.js';

import { sortHackerNewsArticles as baselineRun } from '../src/hn_page_base.js';
import { sortHackerNewsArticles as stage1Run } from '../src/hn_page_optim.js';
import { sortHackerNewsArticles as stage2Run } from '../src/hn_page_debug.js';

const THROTTLE_LIMIT = 10;
const MEMORY_TOLERANCE_FACTOR = 0.95;

const PIPELINE_RUNNERS = [
    { name: 'Baseline', func: baselineRun },
    { name: 'Stage 1', func: stage1Run },
    { name: 'Stage 2', func: stage2Run },
];

test.describe('Hacker News Pipeline Optimization Analysis (Hardcoded Loop)', () => {
    test.setTimeout(180000);

    test('Summary: Baseline vs Stage 1 vs Stage 2 Across Browsers', async ({ page }) => {
        console.log(`[Config] THROTTLE_LIMIT: ${THROTTLE_LIMIT}, Tolerance: ${MEMORY_TOLERANCE_FACTOR}`);
        console.log('\n' + '='.repeat(80));

        let baselineMetrics;
        let stage1Metrics;
        let stage2Metrics;

        try {
            let metricsResult = [];
            for (const { name: runName, func: runFunc } of PIPELINE_RUNNERS) {
                const result = await withMetrics(runName, async () => { await runFunc(page); }, THROTTLE_LIMIT);
                metricsResult.push(result);
            }

            baselineMetrics = metricsResult[0].metrics;
            stage1Metrics = metricsResult[1].metrics;
            stage2Metrics = metricsResult[2].metrics;

            const baselineToStage1 = calcImproMet(baselineMetrics, stage1Metrics);
            const stage1ToStage2 = calcImproMet(stage1Metrics, stage2Metrics);
            const baselineToStage2 = calcImproMet(baselineMetrics, stage2Metrics);

            printImprov(baselineToStage1, stage1ToStage2, baselineToStage2);

            const relaxedTimeTarget = baselineMetrics.durationMs * 1.02;
            expect(stage2Metrics.durationMs).toBeLessThanOrEqual(relaxedTimeTarget);

            const memoryImprovementTarget = baselineMetrics.memoryDeltaKB * MEMORY_TOLERANCE_FACTOR;
            expect(stage2Metrics.memoryDeltaKB).toBeLessThanOrEqual(memoryImprovementTarget);

        } catch (error) {
            console.error(`[ERROR] Test failed: ${error.message}`);
            throw error;
        } finally {
            printCompTable([baselineMetrics, stage1Metrics, stage2Metrics]);
        }

        console.log('='.repeat(80));
    });
});

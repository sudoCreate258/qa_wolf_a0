import { test, expect } from '@playwright/test';
import { withMetrics } from '../src/withMetrics.js';
import { sortHackerNewsArticles as baselineRun  } from '../src/hn_page_base.js';
import { sortHackerNewsArticles as optimizedRun } from '../src/hn_page_optim.js';

test.describe('Hacker News Performance Optimization Analysis', () => {
  test('Summary: Baseline vs Optimized', async () => {
    console.log('\n' + '='.repeat(80));
    
    const baseline = await withMetrics('Baseline Implementation', baselineRun);
    const optimized = await withMetrics('Optimized Implementation', optimizedRun);

    console.log('='.repeat(80));

    console.log('\n📊 Final Comparison:');
    console.table([baseline.metrics, optimized.metrics]);

    const improvements = {
      'Time Improvement': (
        (Number(baseline.metrics.durationMs) - Number(optimized.metrics.durationMs)) /
        Number(baseline.metrics.durationMs) * 100
      ).toFixed(2) + '%',
      'Memory Improvement': (
        (Number(baseline.metrics.memoryDeltaKB) - Number(optimized.metrics.memoryDeltaKB)) /
        Number(baseline.metrics.memoryDeltaKB) * 100
      ).toFixed(2) + '%',
    };
    console.log('\n🎯 Overall Improvements:');
    console.table([improvements]);

    // Assertions: Optimized must be better in ALL dimensions
    expect(typeof baselineRun).toBe('function');
    expect(Number(baseline.metrics.durationMs)).toBeGreaterThan(0);

    expect(Number(optimized.metrics.durationMs))
      .toBeLessThan(Number(baseline.metrics.durationMs));
    
    expect(Number(optimized.metrics.memoryDeltaKB))
      .toBeLessThanOrEqual(Number(baseline.metrics.memoryDeltaKB));
    
  });
});

import * as v8 from 'v8';
import { performance } from 'perf_hooks';
import * as os from 'os';

/**
 * Runs a function while measuring performance, memory, and async metrics.
 */
export async function withMetrics(label, fn, ...args) {
    if (global.gc) global.gc();
    await new Promise(resolve => setTimeout(resolve, 50));

    const start = performance.now();
    const memoryStart = process.memoryUsage().heapUsed;

    let promiseCount = 0;
    let totalPromiseSteps = 0;

    const originalPromiseAll = Promise.all;
    const originalPromiseThen = Promise.prototype.then;

    Promise.all = function (...args) {
        promiseCount++;
        return originalPromiseAll.apply(this, args);
    };

    Promise.prototype.then = function (...args) {
        totalPromiseSteps++;
        return originalPromiseThen.apply(this, args);
    };

    let result;
    let memoryEnd;
    let heapEnd;
    let end;

    try {
        result = await fn(...args);
    } catch (e) {
        console.error(`Error in function ${label}: ${e.message}`);
        throw e;
    } finally {
        Promise.all = originalPromiseAll;
        Promise.prototype.then = originalPromiseThen;

        end = performance.now();
        memoryEnd = process.memoryUsage().heapUsed;
        heapEnd = v8.getHeapStatistics().used_heap_size;
    }

    const durationMs = end - start;
    const memoryDeltaKB = (memoryEnd - memoryStart) / 1024;
    const heapUsedMB = heapEnd / (1024 * 1024);
    const asyncRatio = totalPromiseSteps > 0 ? promiseCount / totalPromiseSteps : 0;

    return {
        result,
        metrics: {
            label,
            durationMs,
            memoryDeltaKB,
            heapUsedMB: heapUsedMB.toFixed(2),
            promiseBatches: promiseCount,
            sequentialAwaits: totalPromiseSteps,
            asyncRatio
        }
    };
}

/**
 * Calculates improvement metrics between two runs.
 */
export function calcImproMet(baseline, improved) {
    const timeImprovement = ((baseline.durationMs - improved.durationMs) / baseline.durationMs) * 100;
    const memoryDeltaImprovement = ((baseline.memoryDeltaKB - improved.memoryDeltaKB) / baseline.memoryDeltaKB) * 100;

    const baselineHeapMB = parseFloat(baseline.heapUsedMB);
    const improvedHeapMB = parseFloat(improved.heapUsedMB);
    const heapFootprintReduction = ((baselineHeapMB - improvedHeapMB) / baselineHeapMB) * 100;

    return {
        Label: `${baseline.label} -> ${improved.label}`,
        Time: `${timeImprovement.toFixed(2)}%`,
        'Memory Delta': `${memoryDeltaImprovement.toFixed(2)}%`,
        'Heap Footprint': `${heapFootprintReduction.toFixed(2)}%`
    };
}

/**
 * Prints a summary of calculated improvement metrics.
 */
export function printImprov(baselineToStage1, stage1ToStage2, baselineToStage2) {
    const overall = baselineToStage2;
    console.log(`\n🎯 Overall Improvements (${overall.Label}):`);
    console.log(`Time: ${overall.Time}, Memory Delta: ${overall['Memory Delta']}, Heap Footprint: ${overall['Heap Footprint']}`);

    console.log('\n🚀 PERFORMANCE IMPROVEMENT SUMMARY:');
    console.table([baselineToStage1, stage1ToStage2, baselineToStage2]);
}

/**
 * Prints raw metrics as a comparison table.
 */
export function printCompTable(metricsArray) {
    if (!metricsArray || metricsArray.some(m => !m)) return;

    const comparisonTable = metricsArray.map(m => ({
        Label: m.label,
        'Duration (ms)': m.durationMs.toFixed(2),
        'Memory Delta (KB)': m.memoryDeltaKB.toFixed(2),
        'Heap Footprint (MB)': m.heapUsedMB,
        'Promise Batches': m.promiseBatches,
        'Total Promise Steps': m.sequentialAwaits,
    }));

    console.log('\n📊 FINAL METRICS TABLE:');
    console.table(comparisonTable);
}

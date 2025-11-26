import * as v8 from 'v8';
import { performance } from 'perf_hooks';

/**
 * Utility to force Garbage Collection and yield the thread.
 */
async function forceGcAndSettle() {
    if (global.gc) {
        // Force V8 to run garbage collection
        global.gc();
    }
    // Yield execution to allow for any pending V8 cleanup tasks
    await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Runs a function once while measuring performance, memory, and async metrics.
 */
async function runOnceWithMetrics(label, fn, ...args) {
    // 1. Establish Clean Baseline (Pre-Execution GC)
    await forceGcAndSettle();

    const start = performance.now();
    // Capture the starting heap usage after GC
    const memoryStart = process.memoryUsage().heapUsed; 

    // Async Metric Overrides
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
        // 2. Execute Function
        result = await fn(...args);
    } catch (e) {
        console.error(`Error in function ${label}: ${e.message}`);
        throw e;
    } finally {
        // 3. Restore Overrides
        Promise.all = originalPromiseAll;
        Promise.prototype.then = originalPromiseThen;

        // 4. Clean Final State (Post-Execution GC)
        await forceGcAndSettle();

        // 5. Capture End Metrics
        end = performance.now();
        memoryEnd = process.memoryUsage().heapUsed;
        heapEnd = v8.getHeapStatistics().used_heap_size;
    }

    // Calculations
    const durationMs = end - start;
    const memoryDeltaKB = (memoryEnd - memoryStart) / 1024; 
    const heapUsedMB = heapEnd / (1024 * 1024);
    
    return {
        result,
        metrics: {
            label,
            durationMs,
            memoryDeltaKB,
            heapUsedMB: heapUsedMB.toFixed(2),
            promiseBatches: promiseCount,
            sequentialAwaits: totalPromiseSteps,
        }
    };
}

/**
 * Runs a function multiple times and returns the average metrics.
 * This is the recommended approach for stable benchmarking.
 */
export async function withAveragedMetrics(label, fn, iterations, ...args) {
    console.log(`Running '${label}' ${iterations} times for averaging...`);
    const allMetrics = [];
    let latestResult;

    for (let i = 0; i < iterations; i++) {
        // Log to show progress and separate runs in the console
        console.log(`  -> Run ${i + 1}/${iterations}`);
        const { result, metrics } = await runOnceWithMetrics(label, fn, ...args);
        allMetrics.push(metrics);
        latestResult = result;
    }

    // Calculate Averages
    const totalMetrics = allMetrics.reduce((acc, metrics) => {
        acc.durationMs += metrics.durationMs;
        acc.memoryDeltaKB += metrics.memoryDeltaKB;
        acc.heapUsedMB += parseFloat(metrics.heapUsedMB);
        acc.promiseBatches += metrics.promiseBatches;
        acc.sequentialAwaits += metrics.sequentialAwaits;
        return acc;
    }, {
        durationMs: 0,
        memoryDeltaKB: 0,
        heapUsedMB: 0,
        promiseBatches: 0,
        sequentialAwaits: 0,
    });

    const avgMetrics = {
        label: `${label} (Avg over ${iterations})`,
        durationMs: totalMetrics.durationMs / iterations,
        memoryDeltaKB: totalMetrics.memoryDeltaKB / iterations,
        heapUsedMB: (totalMetrics.heapUsedMB / iterations).toFixed(2),
        promiseBatches: Math.round(totalMetrics.promiseBatches / iterations),
        sequentialAwaits: Math.round(totalMetrics.sequentialAwaits / iterations),
    };
    
    return { result: latestResult, metrics: avgMetrics };
}


/**
 * Calculates improvement metrics between two runs.
 */
export function calcImproMet(baseline, improved) {
    // Calculate Time Improvement
    const timeImprovement = baseline.durationMs > 0 
        ? ((baseline.durationMs - improved.durationMs) / baseline.durationMs) * 100
        : 0;

    // Calculate Memory Delta Improvement (with guard for division by zero/negative baseline)
    let memoryDeltaImprovement = 0;
    if (baseline.memoryDeltaKB > 0) {
        // Standard calculation: (Baseline Consumption - Improved Consumption/Freeing) / Baseline Consumption
        memoryDeltaImprovement = ((baseline.memoryDeltaKB - improved.memoryDeltaKB) / baseline.memoryDeltaKB) * 100;
    } else {
        // If baseline memory delta was zero or negative (already freeing memory), 
        // improvement is judged by if the improved version is also negative (freer)
        if (improved.memoryDeltaKB < baseline.memoryDeltaKB) {
             // Arbitrarily assign 100% improvement if we improve upon an already efficient baseline
             memoryDeltaImprovement = 100;
        } else {
            memoryDeltaImprovement = 0;
        }
    }
    
    // Calculate Heap Footprint Reduction
    const baselineHeapMB = parseFloat(baseline.heapUsedMB);
    const improvedHeapMB = parseFloat(improved.heapUsedMB);
    const heapFootprintReduction = baselineHeapMB > 0
        ? ((baselineHeapMB - improvedHeapMB) / baselineHeapMB) * 100
        : 0;

    return {
        Label: `${baseline.label.split(' ')[0]} -> ${improved.label.split(' ')[0]}`,
        Time: `${timeImprovement.toFixed(2)}%`,
        'Memory Delta': `${memoryDeltaImprovement.toFixed(2)}%`,
        'Heap Footprint': `${heapFootprintReduction.toFixed(2)}%`
    };
}

/**
 * Prints a summary of calculated improvement metrics.
 */
export function printImprov(baselineToStage1, baselineToStage2) {
    const tableData = [baselineToStage1, baselineToStage2].filter(d => d);

    if (tableData.length === 0) {
        console.log('\n🚀 PERFORMANCE IMPROVEMENT SUMMARY: No improvement metrics provided.');
        return;
    }

    // Use the Stage 2 improvement for the overall summary if available.
    const overall = baselineToStage2 || baselineToStage1;
    
    if (overall) {
        console.log(`\n🎯 Overall Improvements (${overall.Label}):`);
        console.log(`Time: ${overall.Time}, Memory Delta: ${overall['Memory Delta']}, Heap Footprint: ${overall['Heap Footprint']}`);
    }

    console.log('\n🚀 PERFORMANCE IMPROVEMENT SUMMARY:');
    console.table(tableData);
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

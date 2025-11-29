/**
 * src/performance_utils.js
 *
 * This file provides a full suite of utilities for comprehensive benchmarking
 * that measures duration, memory usage, and advanced V8 metrics (like promises)
 * across multiple iterations to ensure statistical reliability.
 */
import * as v8 from 'v8';
import { performance } from 'perf_hooks';

// ==============================================================================
// 1. CORE STATISTICAL UTILITY (For CoV calculation)
// ==============================================================================

/**
 * Calculates the mean, standard deviation, and Coefficient of Variation (CoV)
 * for a set of numerical data.
 * @param {number[]} data - Array of numbers.
 * @returns {object} Statistical metrics.
 */
function calculateStatisticalMetrics(data) {
    if (data.length === 0) {
        return { mean: 0, stdDev: 0, cov: 0 };
    }
    const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
    const variance = data.map(value => Math.pow(value - mean, 2)).reduce((sum, value) => sum + value, 0) / data.length;
    const stdDev = Math.sqrt(variance);
    const cov = mean !== 0 ? (stdDev / mean) * 100 : 0;
    return { mean, stdDev, cov };
}


// ==============================================================================
// 2. CORE MEASUREMENT & GC CONTROL
// ==============================================================================

/**
 * Utility to force Garbage Collection and yield the thread.
 */
async function forceGcAndSettle() {
    // Only attempt GC if it is exposed (e.g., in a Node environment with --expose-gc)
    if (global.gc) {
        // Force V8 to run garbage collection
        global.gc();
    }
    // Yield execution to allow for any pending V8 cleanup tasks
    await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Runs a function once while measuring performance, memory, and async metrics.
 *
 * @param {string} label - Identifier for the run.
 * @param {function} fn - The function to execute.
 * @param {...any} args - Arguments to pass to the function.
 * @returns {Promise<object>} An object containing the result and the raw metrics for one run.
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
    let errorOccurred = false;

    try {
        // 2. Execute Function
        result = await fn(...args);
    } catch (e) {
        // Log the error but don't re-throw, allowing metrics capture to proceed
        console.error(`Error in function ${label}: ${e.message}`);
        errorOccurred = true;
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

        // 6. Establish Clean Baseline (Pre-Execution GC)
        await forceGcAndSettle();

    }

    // Calculations
    const durationMs = end - start;
    const memoryDeltaKB = (memoryEnd - memoryStart) / 1024;
    const heapUsedMB = heapEnd / (1024 * 1024);

    if (errorOccurred) {
        // If an error occurred, return zeroed metrics to prevent skewing averages
        console.warn(`[${label}] Run failed, returning zero metrics for this iteration.`);
        return {
            result: null,
            metrics: {
                label,
                durationMs: 0,
                memoryDeltaKB: 0,
                heapUsedMB: "0.00",
                promiseBatches: 0,
                sequentialAwaits: 0,
            }
        };
    }

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


// ==============================================================================
// 3. AVERAGING RUNNER (Exports to be used by tests)
// ==============================================================================

/**
 * Runs a function multiple times and returns the average metrics.
 *
 * This function now correctly parses arguments to prevent the Playwright 'page'
 * object from being consumed by the optional 'isVerbose' flag.
 *
 * @param {string} label - Name of the run (e.g., 'Baseline').
 * @param {function} fn - The async function that executes the test.
 * @param {number} iterations - The number of times to run the test.
 * @param {boolean|any} arg4 - Either the optional isVerbose boolean or the first argument for fn.
 * @param {...any} restArgs - Remaining arguments for the test function.
 * @returns {Promise<object>} An object containing the final result and averaged metrics.
 */
export async function withAveragedMetrics(label, fn, iterations, arg4, ...restArgs) {
    let isVerbose = false;
    let fnArgs = [];

    // Check if the 4th argument is explicitly a boolean (the verbose flag)
    if (typeof arg4 === 'boolean') {
        isVerbose = arg4;
        fnArgs = restArgs; // Remaining arguments are passed to the function
    } else {
        // If the 4th argument is not a boolean (i.e., it's the 'page' object or null/undefined),
        // we treat it as the first argument for the function and keep verbose off (default).
        fnArgs = [arg4, ...restArgs];
        // isVerbose remains false
    }

    console.log(`Running '${label}' ${iterations} times for averaging...`);
    const allMetrics = [];
    let latestResult;

    for (let i = 0; i < iterations; i++) {
        // Log to show progress and separate runs in the console
        console.log(`  -> Run ${i + 1}/${iterations}`);
        // Pass the correctly parsed function arguments
        const { result, metrics } = await runOnceWithMetrics(label, fn, ...fnArgs);

        if (isVerbose) {
            console.log(`[Run ${i + 1}/${iterations} Metrics]`);
            console.log(JSON.stringify({
                'Duration (ms)': metrics.durationMs.toFixed(2),
                'Memory Delta (KB)': metrics.memoryDeltaKB.toFixed(2),
                'Heap Footprint (MB)': metrics.heapUsedMB,
                'Promise Batches': metrics.promiseBatches,
                'Total Promise Steps': metrics.sequentialAwaits,
            }, null, 2));
        }

        allMetrics.push(metrics);
        latestResult = result;
    }

    const validMetrics = allMetrics.filter(m => m.durationMs > 0 || m.memoryDeltaKB !== 0);
    const runsCount = validMetrics.length;

    if (runsCount === 0) {
         console.warn(`[${label}] All benchmark runs failed or returned zero metrics. Returning zero averages.`);
         return {
            result: null,
            metrics: {
                name: label,
                durationMs: 0,
                memoryDeltaKB: 0,
                heapUsedMB: "0.00",
                promiseBatches: 0,
                sequentialAwaits: 0,
                cov: 0
            }
        };
    }

    // Calculate Averages based only on valid runs
    const totalMetrics = validMetrics.reduce((acc, metrics) => {
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
        name: label,
        durationMs: totalMetrics.durationMs / runsCount,
        memoryDeltaKB: totalMetrics.memoryDeltaKB / runsCount,
        heapUsedMB: (totalMetrics.heapUsedMB / runsCount).toFixed(2),
        promiseBatches: Math.round(totalMetrics.promiseBatches / runsCount),
        sequentialAwaits: Math.round(totalMetrics.sequentialAwaits / runsCount),
        // Calculate a basic CoV for the duration for stability reporting
        cov: calculateStatisticalMetrics(validMetrics.map(m => m.durationMs)).cov,
    };

    return { result: latestResult, metrics: avgMetrics };
}


// ==============================================================================
// 4. COMPARISON & PRINTING (Exports to be used by tests)
// ==============================================================================

/**
 * Calculates the percentage improvement (or regression) of optimized metrics
 * relative to baseline metrics.
 * @param {object} baselineMetrics - Metrics from the baseline run.
 * @param {object} optimizedMetrics - Metrics from the optimized run.
 * @returns {object} Improvement metrics.
 */
export function calcImproMet(baselineMetrics, optimizedMetrics) {
    const calculatePercentageChange = (baseline, optimized) => {
        if (baseline === 0) return 0;
        // Formula: ((Baseline - Optimized) / Baseline) * 100
        // A positive result means improvement (optimized is faster/smaller).
        return ((baseline - optimized) / baseline) * 100;
    };

    const baselineHeapMB = parseFloat(baselineMetrics.heapUsedMB);
    const optimizedHeapMB = parseFloat(optimizedMetrics.heapUsedMB);

    return {
        Label: `${baselineMetrics.name.split(' ')[0]} -> ${optimizedMetrics.name.split(' ')[0]}`,
        durationMs: calculatePercentageChange(baselineMetrics.durationMs, optimizedMetrics.durationMs),
        memoryDeltaKB: calculatePercentageChange(baselineMetrics.memoryDeltaKB, optimizedMetrics.memoryDeltaKB),
        heapFootprint: calculatePercentageChange(baselineHeapMB, optimizedHeapMB),
        promiseBatches: calculatePercentageChange(baselineMetrics.promiseBatches, optimizedMetrics.promiseBatches),
        sequentialAwaits: calculatePercentageChange(baselineMetrics.sequentialAwaits, optimizedMetrics.sequentialAwaits)
    };
}

/**
 * Prints the calculated improvement/regression metrics.
 * @param {object} baselineToStage1 - The result of calcImproMet for stage 1.
 * @param {object} [baselineToStage2] - Optional result of calcImproMet for stage 2.
 */
export function printImprov(baselineToStage1, baselineToStage2) {
    const tableData = [baselineToStage1, baselineToStage2].filter(d => d);

    if (tableData.length === 0) {
        console.log('\n🚀 PERFORMANCE IMPROVEMENT SUMMARY: No improvement metrics provided.');
        return;
    }

    const overall = baselineToStage2 || baselineToStage1;

    console.log(`\n🎯 Overall Improvements (${overall.Label}):`);
    console.log(`Time: ${overall.durationMs.toFixed(2)}%, Memory Delta: ${overall.memoryDeltaKB.toFixed(2)}%, Heap Footprint: ${overall.heapFootprint.toFixed(2)}%`);

    const comparisonTable = tableData.map(m => {
        const format = (value) => {
            const sign = value >= 0 ? '+\u25B2' : '-\u25BC';
            return `${sign} ${Math.abs(value).toFixed(2)}%`;
        };
        return {
            Label: m.Label,
            'Time (ms)': format(m.durationMs),
            'Memory Delta (KB)': format(m.memoryDeltaKB),
            'Heap Footprint (MB)': format(m.heapFootprint),
            'Promise Batches': format(m.promiseBatches),
            'Total Promise Steps': format(m.sequentialAwaits),
        };
    });

    console.log('\n🚀 PERFORMANCE IMPROVEMENT SUMMARY:');
    console.table(comparisonTable);
}

/**
 * Prints raw metrics as a comparison table.
 * @param {object[]} metricsArray - An array of metrics objects to compare.
 */
export function printCompTable(metricsArray) {
    if (!metricsArray || metricsArray.some(m => !m)) return;

    const comparisonTable = metricsArray.map(m => ({
        'Run Name': m.name,
        'Duration (ms)': m.durationMs.toFixed(2),
        'CoV (%)': m.cov.toFixed(2),
        'Memory Delta (KB)': m.memoryDeltaKB.toFixed(2),
        'Heap Footprint (MB)': m.heapUsedMB,
        'Promise Batches': m.promiseBatches,
        'Total Promise Steps': m.sequentialAwaits,
    }));

    console.log('\n📊 FINAL METRICS TABLE:');
    console.table(comparisonTable);
}

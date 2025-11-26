import { performance } from 'perf_hooks';

/**
 * Executes a pipeline function and captures performance metrics.
 *
 * @param {string} label - A label for the measurement (e.g., 'Baseline', 'Stage 1').
 * @param {function(page: Page, maxRetries: number): Promise<object>} pipelineFunction - The async function to execute, which takes the Playwright page and maxRetries.
 * @param {Page} page - The Playwright Page object.
 * @param {number} [maxRetries=1] - Optional number of retries for the pipeline function.
 * @returns {Promise<{metrics: object, result: any}>} The captured metrics and the function's return value.
 */
export async function withMetrics(label, pipelineFunction, page, maxRetries = 1) {
    // Attempt to force garbage collection for cleaner memory measurements
    if (global.gc) {
        global.gc();
    }
    // Wait a short period to ensure GC completes before measuring start state
    await new Promise(resolve => setTimeout(resolve, 50));

    const memoryStart = process.memoryUsage().heapUsed;
    const timeStart = performance.now();

    // Execute the pipeline function, passing required arguments for the stable run
    const result = await pipelineFunction(page, maxRetries);

    const timeEnd = performance.now();
    const memoryEnd = process.memoryUsage().heapUsed;

    const timeDelta = timeEnd - timeStart;
    const memoryDelta = memoryEnd - memoryStart;
    
    // FIX: Safely access totalPromises by checking if 'result' is defined first.
    // The previous error occurred when the pipeline function returned undefined, causing the program to crash.
    const totalPromises = (result && result.totalPromises) || 0;

    const metrics = {
        label: label,
        durationMs: timeDelta, // Aligned with stable property name
        memoryDeltaKB: memoryDelta / 1024, // Aligned with stable property name
        v8HeapFinalMB: memoryEnd / (1024 * 1024),
        totalPromises: totalPromises, // New metric for promise count
    };

    return { metrics, result };
}

/**
 * Calculates the percentage improvement of the Stage 1 metrics over the Baseline.
 * @param {object} baselineMetrics - Metrics from the baseline run.
 * @param {object} stage1Metrics - Metrics from the optimized run.
 * @returns {object} Calculated improvement metrics.
 */
export function calcImproMet(baselineMetrics, stage1Metrics) {
    const calcImprovement = (baseline, optimized) => {
        if (baseline === 0) return 'N/A';
        return (((baseline - optimized) / baseline) * 100).toFixed(2) + '%';
    };

    // Use the stable metric names for calculation
    const timeImprovement = calcImprovement(baselineMetrics.durationMs, stage1Metrics.durationMs);
    const memoryImprovement = calcImprovement(baselineMetrics.memoryDeltaKB, stage1Metrics.memoryDeltaKB);
    
    // New metric: Promise step reduction
    const promiseReduction = calcImprovement(baselineMetrics.totalPromises, stage1Metrics.totalPromises);
    
    return {
        Time: timeImprovement,
        Memory: memoryImprovement,
        'Promise Steps Reduction': promiseReduction // Critical context for the optimization
    };
}

/**
 * Prints the calculated improvement metrics to the console.
 * @param {object} improvementMetrics - The calculated improvement metrics.
 */
export function printImprov(improvementMetrics) {
    console.log('--- Performance Improvement ---');
    console.table(improvementMetrics);
}

/**
 * Prints a comparison table for the raw metrics of the runs.
 * @param {Array<object>} allMetrics - Array of metric objects.
 */
export function printCompTable(allMetrics) {
    const tableData = allMetrics.map(m => ({
        Run: m.label,
        'Time (ms)': m.durationMs.toFixed(2), // Aligned with stable property name
        'Memory Allocation (KB)': m.memoryDeltaKB.toFixed(2), // Aligned with stable property name
        'V8 Heap Footprint (MB)': m.v8HeapFinalMB.toFixed(2),
        'Promise Steps': m.totalPromises.toLocaleString() // New column
    }));
    
    console.log('--- Raw Metrics Comparison ---');
    console.table(tableData, ['Run', 'Time (ms)', 'Memory Allocation (KB)', 'V8 Heap Footprint (MB)', 'Promise Steps']);
}

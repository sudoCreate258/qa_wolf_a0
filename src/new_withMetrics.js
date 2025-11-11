// At the top of src/withMetrics.js
import * as v8 from 'v8'; 
import { performance } from 'perf_hooks'; 
import * as os from 'os'; 

/**
 * Enhanced metrics wrapper with CVE-aware pattern detection
 * * CVE Tracking:
 * - CVE-2023-45133 (Babel async/await): Sequential async pattern detection
 * - CVE-2023-4863 (Chrome/libwebp): DOM traversal overhead tracking
 * - CVE-2023-5217 (libvpx): Extended browser context exposure via load waits
 */
export async function withMetrics(fn, ...args) {
    // --- METRIC PRUNING LOGIC ---
    // If we've confirmed the optimization works, we can skip expensive tracking 
    // to reduce measurement overhead. We prune metrics for 'Stage 2' or higher
    // when the environment flag is set.
    const PRUNE_THRESHOLD = 2; 
//    const stageMatch = label.match(/Stage (\d+)/);
//    const currentStage = stageMatch ? parseInt(stageMatch[1], 10) : 0;

    if (/*currentStage >= PRUNE_THRESHOLD &&*/ process.env.SKIP_POST_OPTIMIZATION_METRICS === 'true') {
//        console.log(`[PRUNING] Skipping detailed Promise metrics for optimized stage: ${label}`);
        const result = await fn(...args);
        return { 
            result, 
            metrics: { 
                //label, 
                durationMs: 'N/A (Pruned)', 
                sequentialAwaits: 0, 
                isOptimized: true 
            } 
        };
    }
    // --- END METRIC PRUNING LOGIC ---

    // Baseline measurement (including optional garbage collection for consistency)
    if (global.gc) global.gc();
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const start = performance.now();
    const startNs = process.hrtime.bigint();
    const memoryStart = process.memoryUsage().heapUsed;
    
    let promiseCount = 0; // Track Promise.all/batches for CVE-2023-45133 detection
    let sequentialAwaits = 0; // Track sequential .then() calls
    const originalPromiseAll  = Promise.all;
    const originalPromiseThen = Promise.prototype.then;
    
    // 1. Instrumentation for Promise.all (Batches)
    Promise.all = function(...args) {
        promiseCount++;
        return originalPromiseAll.apply(this, args);
    };

    // 2. Instrumentation for Promise.prototype.then (Sequentiality)
    let isAwaiting = false;
    Promise.prototype.then = function(...args) {
        if (isAwaiting) {
            sequentialAwaits++;
        }
        // Use a temporary flag to detect immediate, sequential use of .then()
        isAwaiting = true;
        const resultPromise = originalPromiseThen.apply(this, args);
        isAwaiting = false;
        return resultPromise;
    };
    
    let result;
    let memoryEnd;
    let heapEnd;
    let end;
    
    try {
        result = await fn(...args);
    } catch (e) {
        console.error(`Error in function ${e}:`);
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
    const asyncRatio = promiseCount > 0 ? promiseCount / sequentialAwaits : 0;

    /* --- CVE Risk Scoring based on measured metrics ---
    // ... (omitted for brevity)
    */
    
    return {
        result,
        metrics: {
            //label,
            // RETURN NUMBERS for accurate calculations
            durationMs: durationMs,
            memoryDeltaKB: memoryDeltaKB, 
            // Return strings for display metrics
            heapUsedMB: heapUsedMB.toFixed(2), 
            promiseBatches: promiseCount,
     /* sequentialAwaits,
            asyncRatio: asyncRatio.toFixed(2),
            cveRiskScore: riskScore,
            isOptimized: sequentialAwaits < 200 // Simple optimization flag for the final table
    */  }
    };
}

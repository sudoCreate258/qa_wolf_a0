import * as v8 from 'v8'; 
import { performance } from 'perf_hooks'; 
import * as os from 'os'; 

export async function withMetrics(label, fn, ...args) {
    // Baseline measurement
    if (global.gc) global.gc();
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const start = performance.now();
    const startNs = process.hrtime.bigint();
    const memoryStart = process.memoryUsage().heapUsed;
    
    // Track Promise creation
    let promiseCount = 0;
    const originalPromiseAll = Promise.all;
    const originalPromiseThen = Promise.prototype.then;
    
    Promise.all = function(...args) {
        promiseCount++;
        return originalPromiseAll.apply(this, args);
    };
    
    let sequentialAwaits = 0;
    Promise.prototype.then = function(...args) {
        sequentialAwaits++;
        return originalPromiseThen.apply(this, args);
    };
    
    // Execute function
    const timingSamples = [];
    let result;
    
    const sampleStart = performance.now();
    result = await fn(...args);
    const sampleEnd = performance.now();
    timingSamples.push(sampleEnd - sampleStart);
    
    // Restore Promise methods
    Promise.all = originalPromiseAll;
    Promise.prototype.then = originalPromiseThen;
    
    const end = performance.now();
    const endNs = process.hrtime.bigint();
    const memoryEnd = process.memoryUsage().heapUsed;
    
    // Calculate core metrics
    const durationMs = (end - start).toFixed(2);
    //const durationNs = Number(endNs - startNs);
    const memoryDeltaKB = ((memoryEnd - memoryStart) / 1024).toFixed(2);
    const heapStats = v8.getHeapStatistics();
    const heapUsedMB = (heapStats.used_heap_size / 1024 / 1024).toFixed(2);
    
    // Async Pattern Calculation
    const batchRatio = promiseCount / Math.max(sequentialAwaits, 1);
    
    const metrics = {
        label,
        durationMs,
        //durationNs,
        memoryDeltaKB,
        heapUsedMB,
        
        // Performance indicators
        promiseBatches: promiseCount,
        sequentialAwaits,
        batchRatio: batchRatio.toFixed(2),
    };
    
    // Console output (simplified)
    console.log(`\n[METRIC] ${label}`);
    console.log(`  Duration: ${durationMs}ms | Memory: ${memoryDeltaKB}KB | Heap: ${heapUsedMB}MB`);
    console.log(`  Async Pattern: ${promiseCount} batches / ${sequentialAwaits} sequential (ratio: ${batchRatio.toFixed(2)})`);
    
    return { result, metrics };
}

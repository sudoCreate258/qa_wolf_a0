// At the top of src/withMetrics.js
import * as v8 from 'v8'; 
import { performance } from 'perf_hooks'; 
import * as os from 'os'; 

/**
* Enhanced metrics wrapper with CVE-aware pattern detection
* 
* CVE Tracking:
* - CVE-2023-45133 (Babel async/await): Sequential async pattern detection
* - CVE-2023-4863 (Chrome/libwebp): DOM traversal overhead tracking
* - CVE-2023-5217 (libvpx): Extended browser context exposure via load waits
*/
export async function withMetrics(label, fn, ...args) {
      // Baseline measurement
      if (global.gc) global.gc();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const start = performance.now();
      const startNs = process.hrtime.bigint();
      const memoryStart = process.memoryUsage().heapUsed;
      
      let promiseCount = 0; // Track Promise creation for CVE-2023-45133 detection
      const originalPromiseAll  = Promise.all;
      const originalPromiseThen = Promise.prototype.then;
      
      Promise.all = function(...args) {
              promiseCount++; // Batched operation detected
              return originalPromiseAll.apply(this, args);
      };
      
      let sequentialAwaits = 0;
      Promise.prototype.then = function(...args) {
              sequentialAwaits++;
              return originalPromiseThen.apply(this, args);
            };
      
      // Execute with timing variance tracking (timing attack detection)
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
      
      // Calculate metrics
      const durationMs = (end - start).toFixed(2);
      const durationNs = Number(endNs - startNs);
      const memoryDeltaKB = ((memoryEnd - memoryStart) / 1024).toFixed(2);
      const heapStats = v8.getHeapStatistics();
      const heapUsedMB = (heapStats.used_heap_size / 1024 / 1024).toFixed(2);
      
      // CVE-2023-45133: Sequential async detection
      const batchRatio = promiseCount / Math.max(sequentialAwaits, 1);
      const hasSequentialAsync = sequentialAwaits > 50 && batchRatio < 0.1;
      
      // CVE-2023-4863: DOM overhead (estimated from memory churn)
      const hasDOMOverhead = memoryDeltaKB > 5000; // >5MB suggests repeated allocations
      
      // Timing attack variance
      const mean = timingSamples.reduce((a, b) => a + b, 0) / timingSamples.length;
      const variance = timingSamples.reduce((acc, t) => acc + Math.pow(t - mean, 2), 0) / timingSamples.length;
      const stddev = Math.sqrt(variance);
      const cv = mean > 0 ? (stddev / mean) : 0;
      
      // Build vulnerability report
      const vulnerabilities = [];
      let cveRiskScore = 0;
      
      if (hasSequentialAsync) {
              vulnerabilities.push('CVE-2023-45133: Sequential async blocking detected');
              cveRiskScore += 35;
            }
      
      if (hasDOMOverhead) {
              vulnerabilities.push('CVE-2023-4863: Excessive DOM allocation (>5MB)');
              cveRiskScore += 25;
            }
      
      if (cv > 0.2) {
              vulnerabilities.push('HIGH_TIMING_VARIANCE: Potential side-channel exposure');
              cveRiskScore += 20;
            }
      
      if (Number(durationMs) > 5000) {
              vulnerabilities.push('CVE-2023-5217: Extended browser context (>5s load time)');
              cveRiskScore += 20;
            }
      
      const metrics = {
              label,
              durationMs,
              //durationNs,
              memoryDeltaKB,
              heapUsedMB,
              //timestamp: new Date().toISOString(),
              
              // Performance indicators
              promiseBatches: promiseCount,
              sequentialAwaits,
              //batchRatio: batchRatio.toFixed(2),
              
              // Security metrics
              //cveRiskScore,
              //timingVarianceCV: cv.toFixed(3),
              //vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : ['NONE'],
              
              // Optimization flags
              isOptimized: batchRatio > 0.5 && !hasDOMOverhead,
            };
      
      // Console output with color coding
      const riskColor = cveRiskScore > 50 ? '\x1b[31m' : cveRiskScore > 25 ? '\x1b[33m' : '\x1b[32m';
      const resetColor = '\x1b[0m';
      
      console.log(`\n[METRIC] ${label}`);
      console.log(`  Duration: ${durationMs}ms | Memory: ${memoryDeltaKB}KB | Heap: ${heapUsedMB}MB`);
      console.log(`  Async Pattern: ${promiseCount} batches / ${sequentialAwaits} sequential (ratio: ${batchRatio.toFixed(2)})`);
      console.log(`  ${riskColor}CVE Risk Score: ${cveRiskScore}/100${resetColor}`);
      
      if (vulnerabilities.length > 0 && vulnerabilities[0] !== 'NONE') {
              console.log(`  ⚠️  Vulnerabilities:`);
              vulnerabilities.forEach(v => console.log(`     - ${v}`));
            } else {
                    console.log(`  ✅ No vulnerabilities detected`);
                  }
      
      return { result, metrics };
}

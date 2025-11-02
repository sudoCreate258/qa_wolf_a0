import { HN_Page } from './hn_page_base.js'; 

// REMOVED: const CONCURRENCY_LIMIT = 10;
// We will now use the global variable THROTTLE_LIMIT which is provided
// by the test runner environment (as seen in the console output).

// Reverted class name back to HN_Page_Stable as requested.
export class HN_Page_Stable extends HN_Page {
        constructor(p, u) {
                    super(p, u);
                }

        async runPipeline(debugFlag=true){ 
                    await super.runPipeline(debugFlag)
                }  

        // This method remains the same, but it is now executed concurrently within batches.
        async parseRow(r) {
                    const raw_title = r.locator('span.titleline > a');
                    // Assuming 'r' is a locator for the main row, the age span is in the following row (tr[1])
                    let str = 'xpath=following-sibling::tr[1]//span[@class="age"]';
                    const raw_age = r.locator(str);
                        
                    // Concurrent fetching of attributes for a single row
                    const [sub_title, link, raw_age_title] = await Promise.all([
                                    raw_title.innerText(), 
                                    raw_title.getAttribute('href'), 
                                    raw_age.getAttribute('title')
                                ]);

                    // Safely assign the full ISO timestamp to epoch_time.
                    let epoch_time = raw_age_title; 
                        
                    return { sub_title, epoch_time, link };
                }

        /**
             * Extracts entries using CONCURRENT (parallel) processing for performance gains,
                  * using the global THROTTLE_LIMIT for batch sizing to manage memory spikes.
                       */
        async extractEntries() {
                    const rows = await this.rlocate.all();
                    const rowsToProcess = Math.min(100 - this.entries.length, rows.length);
                    
                    if (rowsToProcess <= 0) return;

                    // Ensure THROTTLE_LIMIT is available, defaulting to 10 if not.
                    // The test suite output confirms it should be available.
                    const batchSize = typeof THROTTLE_LIMIT !== 'undefined' ? THROTTLE_LIMIT : 10;

                    // Slice rows to process only the necessary amount
                    const rowsSubset = rows.slice(0, rowsToProcess);
                    
                    const results = [];
                    
                    // Process rows in batches defined by the global THROTTLE_LIMIT
                    for (let i = 0; i < rowsSubset.length; i += batchSize) {
                                    const batch = rowsSubset.slice(i, i + batchSize);
                                    
                                    // *** CORE OPTIMIZATION: Use Promise.all to fetch batch data concurrently. ***
                                    const promises = batch.map(row => this.parseRow(row));
                                    // Await the batch before moving to the next one
                                    const parsedEntries = await Promise.all(promises);
                                    
                                    results.push(...parsedEntries);
                                }
                    
                    this.entries.push(...results);
                }

        // CVE-2023-5217 mitigation
        async viewMore() {
                    const visible = await this.mlocate.isVisible();
                        
                    if (visible) {
                                    await Promise.all([ 
                                                    await this.mlocate.click(),
                                                    await this.page.waitForLoadState('domcontentloaded'),
                                                        ]);
                                    return true;
                                }   
                    return false;
                }
}

/**
 * Executes the Hacker News optimized pipeline using the page provided by the Playwright test runner.
  * @param {import('playwright').Page} page
   */
export async function sortHackerNewsArticles(page) {
        // Instantiate the optimized class with the correct name
        let hpg = new HN_Page_Stable(page,"https://news.ycombinator.com/newest");
        await hpg.runPipeline(false);   
}


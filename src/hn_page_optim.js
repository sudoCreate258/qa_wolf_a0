import { chromium } from "playwright";
import { firefox }  from "playwright";
import { webkit }   from "playwright";

import { HN_Page } from './hn_page_base.js'; 

export class HN_Page_Optim extends HN_Page {
    constructor(p, u) {
        super(p, u);
    }
        
    async extractEntries() {
        try{
        const rows = await this.rlocate.all();
        const rowsToProcess = Math.min(100 - this.entries.length, rows.length);
                    
        if (rowsToProcess <= 0) return;

        const batchSize = typeof THROTTLE_LIMIT !== 'undefined' ? THROTTLE_LIMIT : 10;
        const rowsSubset = rows.slice(0, rowsToProcess);
        
        let results = []
        for (let i = 0; i < rowsSubset.length; i += batchSize) {
            const batch = rowsSubset.slice(i, i + batchSize);
            const batchPromises = batch.map(row => this.parseRow(row));

            const parsedEntries = await Promise.all(batchPromises);
            results.push(...parsedEntries);
        }
        this.entries.push(...results);
        } catch(error){
            console.warn(`[GRACEFUL EXIT - HN_Page] Error during row extraction (rlocate.all or parseRow). Error: ${error.message}`);
        }
    }

    async viewMore() {  // CVE-2023-5217 mitigation
        const visible = await this.mlocate.isVisible();
                        
        if (visible) {
            await Promise.all([ 
                this.mlocate.click(),
                this.page.waitForLoadState('domcontentloaded'),
             ]);
            return true;
        }   
        return false;
    }
}

export async function sortHackerNewsArticles(page) {
    const hpg = new HN_Page_Optim(page);
    await hpg.runPipeline();    
}

export async function old_sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page    = await context.newPage();

    const hpg = new HN_Page_Optim(page);
    await hpg.runPipeline();    
    await browser.close();      
}

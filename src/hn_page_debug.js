import { HN_Page_Optim } from './hn_page_optim.js'; 
import { chromium } from "playwright";

export class HN_Page_Debug extends HN_Page_Optim{ 
    constructor(p, u) {
        super(p);
    }

    async runPipeline(debugFlag=true){ 
        await this.visitPage();
        await this.extractEntries();
        this.validateEntries();
        
        if(!debugFlag) this.printToScreen();
    }   

    async extractEntries() {
        const batchSize = process.env.THROTTLE_LIMIT;
        //const batchSize = typeof  !== 'undefined' ? process.env.THROTTLE_LIMIT : 5; 
        const moreLink = this.page.locator('a.morelink');

        do{ 
            const rows = await this.rlocate.all();
            const rowsToProcess = Math.min(100 - this.entries.length, rows.length);
            if (rowsToProcess === 0) break; 

            const rowsSubset = rows.slice(0, rowsToProcess);
            for (let i = 0; i < rowsSubset.length; i += batchSize) {
                const batch = rowsSubset.slice(i, i + batchSize);
                const batchPromises = batch.map(r => this.parseRow(r));

                const parsedEntries = await Promise.all(batchPromises);
                this.entries.push(...parsedEntries);
            } 

            const morePageFlag = this.entries.length < 100 && rowsToProcess === rows.length;
            if(morePageFlag && await moreLink.isVisible()) 
                await moreLink.click(); // SEQUENTIAL BOTTLENECK: Handle Navigation to the next page
            else break; 

        }while (this.entries.length < 100);
    }
}

export async function sortHackerNewsArticles(page) {
    const hpg = new HN_Page_Debug(page);
    await hpg.runPipeline();    
}

export async function old_sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page    = await context.newPage();

    const hpg = new HN_Page_Debug(page);
    await hpg.runPipeline();   
    await browser.close();      
}

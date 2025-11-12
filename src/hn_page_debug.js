import { HN_Page_Optim } from './hn_page_optim.js'; 
import { chromium } from "playwright";

export class HN_Page_Debug extends HN_Page_Optim{ 
    constructor(p) {
        super(p);
    }

    async runPipeline(debugFlag=true){ 
        await this.visitPage();
        await this.extractEntries();
        this.validateEntries();
        
        if(!debugFlag) this.printToScreen();
    }   

    async extractEntries() {
        const batchSize = this.tLimit; 
        const moreLink = this.page.locator('a.morelink');

        do{ 
            try{
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
            }catch(error){
                console.warn(`[GRACEFUL EXIT - HN_Page] Error during row extraction (rlocate.all or parseRow). Error: ${error.message}`);
                break;
            }

        }while (this.entries.length < 100);
    }
}

export async function testSortHN(page) {
    let throttle = 5;
    const hpg = new HN_Page_Debug(page,throttle);
    await hpg.runPipeline();    
}

export async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page    = await context.newPage();

    const hpg = new HN_Page_Debug(page);
    await hpg.runPipeline();   
    await browser.close();      
}

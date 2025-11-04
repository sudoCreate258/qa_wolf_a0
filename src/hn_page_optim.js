import { chromium } from "playwright";
import { HN_Page } from './hn_page_base.js'; 

export class HN_Page_Optim extends HN_Page {
    constructor(p, u="https://news.ycombinator.com/newest") {
        super(p, u);
    }
        
    async extractEntries() {
        const rows = await this.rlocate.all();
        const rowsToProcess = Math.min(100 - this.entries.length, rows.length);
                    
        if (rowsToProcess <= 0) return;

        const batchSize = typeof THROTTLE_LIMIT !== 'undefined' ? THROTTLE_LIMIT : 10;
        const rowsSubset = rows.slice(0, rowsToProcess);
        
        let results = []
        for (let i = 0; i < rowsSubset.length; i += batchSize) {
            const batch = rowsSubset.slice(i, i + batchSize);
            const promises = batch.map(row => this.parseRow(row));

            const parsedEntries = await Promise.all(promises);
            results.push(...parsedEntries);
        }
        this.entries.push(...results);
    }

    async parseRow(r) {
        const raw_title = r.locator('span.titleline > a');
        let str = 'xpath=following-sibling::tr[1]//span[@class="age"]';
        const raw_age = r.locator(str);
                        
        const [sub_title, link, raw_age_title] = await Promise.all([
                    raw_title.innerText(), 
                    raw_title.getAttribute('href'), 
                    raw_age.getAttribute('title')
        ]);

        let epoch_time = raw_age_title;             
        return { sub_title, epoch_time, link };
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

export async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page    = await context.newPage();

    const hpg = new HN_Page_Optim(page);
    await hpg.runPipeline(false);    
    await browser.close();      
}

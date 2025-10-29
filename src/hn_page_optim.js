import { chromium } from "playwright";

import { HN_Page } from './hn_page_base.js'; 

export class HN_Page_Optim extends HN_Page {
    constructor(p, u) {
        super(p, u);
    }

    async runPipeline(debugFlag=true){ 
        await super.runPipeline(debugFlag)
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

        let array = raw_age_title.split('T');
        let epoch_time = array[1].split(' ')[1]

        return { sub_title, epoch_time, link };
    }

  async extractEntries() {
    const rows = await this.rlocate.all();
    const limit = Math.min(100 - this.entries.length, rows.length);
    
    if (limit <= 0) return;
    
    const parsedBatch = await Promise.all(
      rows.slice(0, limit).map(r => this.parseRow(r))
    );  // Eliminates sequential async blocking
    
    this.entries.push(...parsedBatch);
  }

  // CVE-2023-5217 mitigation
  async viewMore() {
    const visible = await this.mlocate.isVisible();
    
    if (visible) {
      await Promise.all([ 
        this.page.waitForLoadState('domcontentloaded'), 
        this.mlocate.click()
      ]);
      
      //await this.page.waitForFunction(() => document.readyState === 'complete');
      
      return true;
    }   
    return false;
  }
}

export async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let hpg = new HN_Page_Optim(page,"https://news.ycombinator.com/newest");
    await hpg.runPipeline(false);    
    await browser.close();      
}

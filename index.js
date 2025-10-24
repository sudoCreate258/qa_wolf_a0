// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

class HN_Page{ 
    constructor(p,u){
        this.entries = [];
        this.page = p;
        this.url  = u;
        this.rlocate = null;
        this.mLocate = null;
    }   //TODO validate + print first 100 articles (new to old)

    async runPipeline(){ 
        await this.visitPage();
        for(let x=0; x<4; x++){
            await this.extractEntries();
            const clicked = await this.viewMore();
        } 
        this.validateEntries();
        this.printToScreen();
    }   

    printToScreen(){
        console.log("Extracted Entries:");
        let c = 0; 
        for(const e of this.entries)
            console.log(`${++c} ${e.sub_title}`);
    }

    async visitPage(){
        await this.page.goto(this.url);
        await this.page.waitForLoadState("load");

        this.rlocate = this.page.locator('tr.athing');  //table set
        this.mlocate = this.page.locator('a.morelink'); //more button
    }

    async extractEntries(){
        const rows = await this.rlocate.all();
        for(const r of rows){
            let entrySize = this.entries.length;
            let sizeFlag = entrySize < 100; 
            
            const parsed = sizeFlag ? await this.parseRow(r) : null;
            if(sizeFlag) this.entries.push(parsed);
            else         break;
        }
    }

    validateEntries(){
        this.entries.sort((a,b) => b.epoch_time - a.epoch_time);
    }

    async parseRow(r){
        const raw_title = r.locator('span.titleline > a');
        const sub_title = await raw_title.innerText();
        const link = await raw_title.getAttribute('href');
        
        let str = 'xpath=following-sibling::tr[1]//span[@class="age"]'
        const raw_age = r.locator(str); 
        const raw_age_text  = await raw_age.textContent();
        const raw_age_title = await raw_age.getAttribute('title');
        
        let array = raw_age_title.split('T');
        let epoch_time = array[1].split(' ')[1]

        return { sub_title, epoch_time, link };
    }

    async viewMore(){
        const visible = await this.mlocate.isVisible();
        if(visible){
            await this.mlocate.click();
            await this.page.waitForLoadState("load");
            return true;
        }
        return false;
    }
}

async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let hpg = new HN_Page(page,"https://news.ycombinator.com/newest");
    await hpg.runPipeline();    
    await browser.close();      
}

(async () => {
  await sortHackerNewsArticles();
})();

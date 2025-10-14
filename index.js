// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

//TODO validate + print first 100 articles (new to old)
class HN_Page{ 
    constructor(p,u){
        this.entries = [];
        this.page = p;
        this.url  = u;
        this.rlocate = null;
    }
    
    async parseRow(r){
        const raw_title = r.locator('span.titleline > a');
        const sub_title = await raw_title.innerText();

        const link = await raw_title.getAttribute('href');

        console.log(`${sub_title} ${link}`);
        //const link = r.locator('href');
        //const age = r.locator('span.age');

        return {
            sub_title: sub_title.trim() ,
            link: link,
        };
    }

    async visitPage(){
        await this.page.goto(this.url);
        this.rlocate = this.page.locator('tr.athing');
    }

    async extractEntries(){
        const rows = await this.rlocate.all();
        for(const r of rows){
            const parsed = await this.parseRow(r);
            this.entries.push(parsed);
        }
    }

    printToScreen(){
        console.log("Extracted Entries:");
        for(const e of this.entries){
            console.log(`${e}`);
        }
    }

    async runPipeline(){//loop such that 4 max iterations on more button
        await this.visitPage();
        await this.extractEntries();
        //this.printToScreen();
    }   
}

async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let hpg = new HN_Page(page,"https://news.ycombinator.com/newest");
    await hpg.runPipeline();    // -- run object function
//await browser.close();      // -- close playwright features
}

(async () => {
  await sortHackerNewsArticles();
})();

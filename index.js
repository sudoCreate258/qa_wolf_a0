// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

class HN_Page{ //TODO validate + print first 100 articles (new to old)
    constructor(p,u){
        this.page = p;
        this.url = u;
        this.pageFlag = true;
    }
    
    async goToSite(){
        await this.page.goto(this.url);
    }

    runPipeline(DEBUG=true){
        this.pageFlag = false;
        this.goToSite();
/*      async loadRows(DEBUG){}
        async extractEntries(){}
            //more button
            //entry locator
            //entry container
        printToScreen(){}*/
    }

    getPageFlag(){
        return this.pageFlag;
    }
}

    async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    // -- create news page object -- go to Hacker News
    let hpage = new HN_Page(page,"https://news.ycombinator.com/newest")
    let pageFlag = hpage.getPageFlag();

    while(pageFlag){
        hpage.runPipeline()
        pageFlag = hpage.getPageFlag();
    }
}

(async () => {
  await sortHackerNewsArticles();
})();

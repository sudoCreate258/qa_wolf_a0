// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

class HN_Page{ //TODO validate + print first 100 articles (new to old)
    constructor(p){
        this.page = p;
        this.pageFlag = false;
        //more button
        //entry locator
        //entry container
    }
    getPageFlag(){ return this.pageFlag;}

    async gotToSite(URL){
        await this.page.goto(URL);
        return page;
    }

/*  async loadRows(DEBUG){}
    async extractEntries(){}
    runPipeline(DEBUG){}
    printToScreen(){}
}*/

    async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    // -- create news page object -- go to Hacker News
    // -- page = goToSite(url="https://news.ycombinator.com/newest")

    let pageFlag = true; 

    while (pageFlag){
        // -- runPipeline(DEBUG)
        // -- pageFlag = getPageFlag()
    }
}

(async () => {
  await sortHackerNewsArticles();
})();

// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");
// TODO - validate + print first 100 articles (new to old)
/**
class HN_Page{
    constructor(page){}

    async gotToSite( URL ){}
    loadRoads(DEBUG) {}
    runPipeline(DEBUG){}
    async extractEntries(){}
    printToScreen()
}
**/

async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    // -- create news page object
    // go to Hacker News
    //await page.goto("https://news.ycombinator.com/newest");
    // -- goToSite( URL )
    let pageFlag = true; 

    while (pageFlag){
        // -- loadRows(DEBUG) 
        // -- runPipeline(DEBUG)
        // -- updatePageFlag()
    }
    // -- printToScreen(DEBUG)
}

(async () => {
  await sortHackerNewsArticles();
})();

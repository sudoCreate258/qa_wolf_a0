// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

/**class HN_Page{ //TODO validate + print first 100 articles (new to old)
    constructor(page){}
    gotToSite(URL){
    loadRoads(DEBUG) {}
    runPipeline(DEBUG){}
    extractEntries(){}
    printToScreen()
}**/

async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    // -- create news page object -- go to Hacker News
    // -- goToSite(URL="https://news.ycombinator.com/newest")

    let pageFlag = true; 

    while (pageFlag){
        // -- runPipeline(DEBUG)
        // -- updatePageFlag()
    }
    // -- printToScreen(DEBUG)
}

(async () => {
  await sortHackerNewsArticles();
})();

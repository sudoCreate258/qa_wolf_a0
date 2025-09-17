// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

async function sortHackerNewsArticles() {
    // launch browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // go to Hacker News
    await page.goto("https://news.ycombinator.com/newest");
    
    // TODO - validate + print first 100 articles (new to old)
    //input - variable declaration
    let articleQ = [];
    let pageCount = 0;
    let morePageFlag = true;

    //process 
    while (morePageFlag){
        await loadRows(page);//allow pages to load
        //extract and parse info from page
        //populate queue in time "order" (new to old)
        //update flag w if len(queue) > 100
    }
    //output to screen
    //prepare post for screen console (first 100)
    //print first 100 items

}

(async () => {
  await sortHackerNewsArticles();
})();

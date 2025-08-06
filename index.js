// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

async function sortHackerNewsArticles() {
  // launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

    // TODO - validate + print first 100 articles (new to old)
    // go to Hacker News
    //input
    await page.goto("https://news.ycombinator.com/newest");
    //process - extract all 100 into an array
    //        - parse time since post
    //        - validate by time new to old (sort)
    //        - prepare post for screen console
    //output to screen
}

(async () => {
  await sortHackerNewsArticles();
})();

// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
import { chromium } from "playwright";
import { HN_Page_Optim } from './hn_page_optim.js'; 

async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    let hpg = new HN_Page_Optim(page,"https://news.ycombinator.com/newest");
    await hpg.runPipeline(false);    
    await browser.close();      
}

(async () => {
  await sortHackerNewsArticles();
})();

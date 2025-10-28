// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } from "playwright";
import { HN_Page } from './hn_page_base.js'; 

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

import { chromium } from "playwright";
import { HN_Page_Optim } from './hn_page_optim.js';

export class HN_Page_Debug extends HN_Page_Optim {
    async extractEntries() {
        console.log("[DEBUG] Extracting entries with throttling...");
        await super.extractEntries();
        console.log(`[DEBUG] Total entries after extraction: ${this.entries.length}`);
    }

    async viewMore() {
        console.log("[DEBUG] Attempting to click 'more' link...");
        const success = await super.viewMore();
        console.log(`[DEBUG] View more success: ${success}`);
        return success;
    }
}

export async function sortHackerNewsArticles(page) {
    const hpg = new HN_Page_Debug(page);
    await hpg.runPipeline();
}

import { chromium } from "playwright";
import { HN_Page } from './hn_page_base.js';

export class HN_Page_Optim extends HN_Page {
    constructor(p,tl) {
        super(p);
        this.tLimit = tl;
    }

    async visitPage(){
        await this.page.goto(this.url);
        await this.page.waitForLoadState("load");
        this.mlocate = this.page.locator("a.morelink");
    }

    async extractEntries() {
        try {
            const allPageEntries = await this.page.evaluate(() => {
                
                const parseRow = (r) => {
                    const titleLink = r.querySelector("span.titleline > a");
                    const sub_title = titleLink?.textContent.trim() || "";
                    const link = titleLink?.getAttribute('href') || "";

                    const subtextRow = r.nextElementSibling; // The <tr> containing subtext/age
                    const ageSpan = subtextRow?.querySelector('span.age');
                    const raw_age_title = ageSpan?.getAttribute('title'); 
                    
                    let epoch_time = '';
                    if (raw_age_title) {
                        try {
                            const array = raw_age_title.split('T');
                            if (array.length > 1) {
                                const partsAfterT = array[1].split(' '); 
                                epoch_time = partsAfterT.length > 1 ? partsAfterT[1] : '';
                            }
                        } catch (e) {
                            epoch_time = 'PARSE_ERROR';
                        }
                    }
                    
                    return { sub_title, epoch_time, link };
                }

                const rowLocators = document.querySelectorAll("tr.athing");
                
                return Array.from(rowLocators).map(parseRow);
            });

            if (this.entries.length < 90)
                this.entries.push(...allPageEntries);
            else
                this.entries.push(...allPageEntries.slice(0,10));

        } catch (error) {
            console.error("[ULTRA SURGICAL ERROR] Failed to extract entries via evaluate:", error.message);
        }
    }

    async viewMore() {
        const visible = await this.mlocate.isVisible();
        if (visible) {
            await Promise.all([
                this.mlocate.click(),
                this.page.waitForLoadState('domcontentloaded'),
            ]);
            return true;
        }
        return false;
    }
}

export async function testSortHN(page) {
    let throttle = 5;
    const hpg = new HN_Page_Optim(page,throttle);
    await hpg.runPipeline();
}

export async function sortHackerNewsArticles() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const hpg = new HN_Page_Optim(page);
    await hpg.runPipeline();
    await browser.close();
}

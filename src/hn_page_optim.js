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
            // 2. Optimized Extraction (Single IPC Trip)
            const allPageEntries = await this.page.evaluate(() => {
                
                // --- INTERNAL parseRow FUNCTION (Browser Context Only) ---
                /**
                 * Parses a single row element (r) entirely in the browser using 
                 * native DOM methods for speed.
                 * @param {Element} r - The <tr> element corresponding to 'tr.athing'.
                 * @returns {Object} Extracted data.
                 */
                const parseRow = (r) => {
                    // 1. Title and Link
                    const titleLink = r.querySelector("span.titleline > a");
                    const sub_title = titleLink?.textContent.trim() || "";
                    const link = titleLink?.getAttribute('href') || "";

                    // 2. Complex Sibling/Timestamp Extraction (Equivalent of following-sibling::tr[1])
                    const subtextRow = r.nextElementSibling; // The <tr> containing subtext/age
                    const ageSpan = subtextRow?.querySelector('span.age');
                    const raw_age_title = ageSpan?.getAttribute('title'); 
                    
                    // 3. String manipulation to get epoch_time
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
                // --- END INTERNAL parseRow FUNCTION ---

                const rowLocators = document.querySelectorAll("tr.athing");
                
                // Call the internal helper function for each element
                return Array.from(rowLocators).map(parseRow);
            });

            // 3. Slice and Update (Node.js Side)
            this.entries.push(...allPageEntries);
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

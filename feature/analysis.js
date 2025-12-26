/* global chrome */

// Util
import {median}                     from "/feature/util/median.js";
import {getMonkeytypeLink}          from "/feature/util/text-to-monkeytype-link.js";

// Providers
import { text }                     from "/feature/data/text-provider.js"
import {getMistakeWords, getRecords, getSlowWords} from "/feature/data/records-provider.js";

// Project
import { WordStatistic }            from "/feature/data/word-statistic-class.js";
import { renderRawData }            from "/feature/page/raw-data/raw-data.js";
import { renderRuns}                from "/feature/page/runs/runs.js";
import { renderStatistics }         from "/feature/page/entry/entry.js";
import { setupPageSwitcher }        from "/feature/page/pager-switcher.js";
import { renderBoxPracticeWords }   from "/feature/page/box-practice-words.js";
import { renderMistakesPage }       from "/feature/page/mistakes/mistakes.js";
import { renderPageSlow }           from "/feature/page/slow/slow.js";

setupPageSwitcher()
renderRawData()
renderStatistics().catch(console.error);
renderRuns()
renderMistakesPage().catch(console.error);
renderPageSlow().catch(console.error);

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.records) {
        console.log("Records changed:", changes.records);
        renderRawData()
        renderStatistics().catch(console.error);
        renderRuns()
        renderMistakesPage().catch(console.error);
        renderPageSlow().catch(console.error);
    }
});



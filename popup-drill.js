/* global MTLAnalyzer */
// The popup's "Weak-spot drill" button: opens a Monkeytype test aimed at
// your weak spots, from the tests in your newest test's language. Disabled
// until there are mistakes to work on.

import { computePatterns } from "/feature/data/patterns.js";
import { drillFor } from "/feature/data/drill.js";
import { getMonkeytypeLink } from "/feature/util/text-to-monkeytype-link.js";

const button = document.getElementById("drillButton");
const hint = document.getElementById("drillHint");

chrome.storage.local.get(["records", "wordLists"], ({ records = [], wordLists = {} }) => {
    const language = [...records].reverse().find((r) => r.language)?.language;
    const same = language ? records.filter((r) => r.language === language) : records;
    const drill = drillFor(computePatterns(same, MTLAnalyzer.analyzeWord), same, wordLists);
    if (drill.words.length < 2) {
        button.disabled = true;
        hint.textContent = "Type a few tests on Monkeytype first: the drill is built from your mistakes.";
        return;
    }
    button.disabled = false;
    hint.textContent = drill.fromList
        ? `${drill.limit} words from ${drill.language} with your weakest letters`
        : "From words you have typed (the full word list is saved after your next test)";
    button.addEventListener("click", () => {
        chrome.tabs.create({ url: getMonkeytypeLink(drill.words, drill.limit) });
    });
});

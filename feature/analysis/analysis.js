/* global chrome */
import {median} from "./util/utils.js";
import {getMonkeytypeLink} from "./util/text-to-monkeytype-link.js";

// TODO
// Auto update
//

// Load data first
chrome.storage.local.get(["records"], (result) => {
    document
        .getElementById("dataOutput")
        .textContent
        = JSON.stringify(result.records || [], null, 2);
});

// Page switching
document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update menu
        document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show correct page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(btn.dataset.page).classList.add('active');
    });
});

function loadOverview() {
    chrome.storage.local.get(["records"], (result) => {
        const records = result.records || [];
        const tbody = document.querySelector("#dataTable tbody");
        tbody.innerHTML = "";

        // Sort newest first
        records.slice().reverse().forEach(record => {
            const date = new Date(record.time).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', '');

            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${date}</td>
        <td>${record.overallWPM || '—'}</td>
        <td>${record.words.length}</td>
      `;
            tbody.appendChild(row);
        });

        let unique = new Set();
        let total = 0;
        records.forEach(record => {
            record.words.forEach(w => {
                if (w.wordCorrected) unique.add(w.wordCorrected);
                total++;
            });
        });
        document.getElementById("uniqueWords").textContent = unique.size;
        document.getElementById("totalWords").textContent = total;

    });



}

// Call on load and when switching to overview
document.querySelector('[data-page="overview"]').addEventListener('click', loadOverview);

// Initial load if starting on overview
if (document.querySelector('.page.active').id === 'overview') loadOverview();


const MIN_OCCURRENCES = 3;
const MIN_WPM_SAMPLES = 3;
const TEXT_NO_PRACTICE_WORDS = "Please practice in Monkeytype in order to collect data for this analysis."

function loadErrorAnalysis() {
    chrome.storage.local.get(["records"], (result) => {
        const entries = result.records || [];
        const wordStats = {};


        entries.forEach(entry => {

            // currently there is a bug in the data that adds more chars than the word only. This filers there errors out.
            entry.words = entry.words.filter(wordInfo =>
                typeof wordInfo.wordCorrected === 'string' &&
                !wordInfo.wordCorrected.includes('\n')
            );

            entry.words.forEach(wordInfo => {
                const word = wordInfo.wordCorrected;
                const isMistake = wordInfo.reason === "corrected";
                const wpm = wordInfo.wpm;

                if (!wordStats[word]) {
                    wordStats[word] = {
                        word: word,
                        occurrences: 0,
                        mistakes: 0,
                        wpmValues: [],
                        cleanWpmValues: []
                    };
                }

                const stats = wordStats[word];
                stats.occurrences++;
                if (isMistake) stats.mistakes++;
                if (typeof wpm === 'number') {
                    stats.wpmValues.push(wpm);
                    if (!isMistake) stats.cleanWpmValues.push(wpm);
                }
            });
        });

        // High mistake words
        const filtered = Object.values(wordStats)
            .filter(ws => ws.occurrences >= MIN_OCCURRENCES)
            .filter(ws => ws.mistakes > 0)
            .sort((a, b) => (b.mistakes / b.occurrences) - (a.mistakes / a.occurrences));

        // Slow words
        const slowCandidates = Object.values(wordStats)
            .filter(ws => ws.cleanWpmValues.length >= MIN_WPM_SAMPLES);
        slowCandidates.sort((a, b) => median(a.cleanWpmValues) - median(b.cleanWpmValues));


        displayPracticeWords(slowCandidates.slice(0,10), "practiceSlow", "practice-box-slow-words")
        displayPracticeWords(filtered.slice(0,10), "practiceMistakes", "practice-box-mistyped-words")

        function displayPracticeWords(words, divLabel, idBox) {
            const div = document.getElementById(divLabel);
            const divBox = document.getElementById(idBox);
            const wordsString = words.map(ws => ws.word).join(" ");
            const wordsArray = words.map(ws => ws.word)

            function onClick() {
                if (wordsArray.length > 1) {
                    const url = getMonkeytypeLink(wordsArray);
                    window.open(url, "_blank");
                } else window.open("https://monkeytype.com", "_blank");
            }

            if (wordsArray.length === 0) {
                div.textContent  =  TEXT_NO_PRACTICE_WORDS
                if (divBox.dataset.listenerAdded) divBox.removeEventListener("click", onClick)
            } else {
                div.textContent = wordsString;
            }

            if (!divBox.dataset.listenerAdded) {
                divBox.addEventListener("click", onClick)
                divBox.dataset.listenerAdded = "true"; // Mark that listener is added
            }
        }


        // Populate tables
        document.querySelector("#mistakeTable tbody").innerHTML = filtered
            .map((ws, i) => `<tr><td>${i+1}</td><td>${ws.word}</td><td>${ws.occurrences}</td><td>${ws.mistakes}</td><td>${(ws.mistakes/ws.occurrences*100).toFixed(1)}%</td></tr>`)
            .join("");

        document.querySelector("#slowTable tbody").innerHTML = slowCandidates
            .map((ws, i) => {

                const speeds = ws.cleanWpmValues
                    .sort((a,b) => a-b)
                    .map(v => Math.round(v))
                    .join(" ") || "none recorded";

                return `<tr class="clickable-row">
    <td>${i+1}</td>
    <td>${ws.word || "?"}</td>
    <td>${ws.cleanWpmValues.length}</td>
    <td>${Math.round(median(ws.cleanWpmValues))}</td>
</tr>
<tr class="details-row"><td colspan="4" style="padding:0; border:none;">
    <div class="details-box">
        <strong>All speeds in wpm for "${ws.word}":</strong> <br>${speeds}
    </div>
</td></tr>`;
            }).join("");

        document.querySelectorAll('.clickable-row').forEach(row => {
            row.addEventListener('click', () => {
                const details = row.nextElementSibling;
                details.style.display = details.style.display === 'table-row' ? 'none' : 'table-row';
            });
        });




    });



    }

document.querySelector('[data-page="errors"]').addEventListener('click', loadErrorAnalysis);

document.querySelector('[data-page="slow"]').addEventListener('click', loadErrorAnalysis);




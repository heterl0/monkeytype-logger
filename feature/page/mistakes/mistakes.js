import {getMistakeWords, getRecords, getSlowWords} from "/feature/data/records-provider.js";
import {renderBoxPracticeWords} from "../box-practice-words.js";

export async function renderMistakesPage() {
    const MIN_COUNT_MISTAKES = 2;
    const words_mistake = await getMistakeWords(MIN_COUNT_MISTAKES)

    renderBoxPracticeWords(words_mistake.slice(0,10), "practiceMistakes", "practice-box-mistyped-words")

    // render table
    document.querySelector("#mistakeTable tbody").innerHTML = words_mistake
        .map((ws, i) => `<tr><td>${i+1}</td><td>${ws.word}</td><td>${ws.count_total}</td><td>${ws.count_mistakes}</td><td>${(ws.count_mistakes/ws.count_total*100).toFixed(1)}%</td></tr>`)
        .join("");
}

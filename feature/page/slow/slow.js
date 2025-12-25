import {getSlowWords} from "../../data/records-provider.js";
import {renderBoxPracticeWords} from "../box-practice-words.js";
import {median} from "../../util/median.js";


export async function renderPageSlow(){
    const MIN_WPM_SPEEDS = 3;
    const words_slow = await getSlowWords(MIN_WPM_SPEEDS)

    renderBoxPracticeWords(words_slow.slice(0, 10), "practiceSlow", "practice-box-slow-words")

    document.querySelector("#slowTable tbody").innerHTML = words_slow
        .map((ws, i) => {

            const speeds = ws.wpm_speeds_correct
                .sort((a,b) => a-b)
                .map(v => Math.round(v))
                .join(" ") || "none recorded";

            return `<tr class="clickable-row">
        <td>${i+1}</td>
        <td>${ws.word || "?"}</td>
        <td>${ws.wpm_speeds_correct.length}</td>
        <td>${Math.round(median(ws.wpm_speeds_correct))}</td>
    </tr>
    <tr class="details-row"><td colspan="4" style="padding:0; border:none;">
        <div class="details-box">
            <strong>All speeds in wpm for "${ws.word}":</strong> <br>${speeds}
        </div>
    </td></tr>`;
        }).join("");

    makeRowClickable()
}




function makeRowClickable(){
    document.querySelectorAll('.clickable-row').forEach(row => {
        row.addEventListener('click', () => {
            const details = row.nextElementSibling;
            details.style.display = details.style.display === 'table-row' ? 'none' : 'table-row';
        });
    });
}
import { getMonkeytypeLink }          from "/feature/util/text-to-monkeytype-link.js";
import { text } from "/feature/data/text-provider.js";

export function renderBoxPracticeWords(words, divLabel, idBox) {
    const div = document.getElementById(divLabel);
    const divBox = document.getElementById(idBox);
    const wordsString = words.map(ws => ws.word).join(" ");
    const wordsArray = words.map(ws => ws.word)

    function onClick() {
        if (wordsArray.length > 1)
            window.open(getMonkeytypeLink(wordsArray), "_blank");
        else
            window.open("https://monkeytype.com/", "_blank");
    }

    if (wordsArray.length === 0) {
        div.textContent  =  text.practice_box.no_content
        //if (divBox.dataset.listenerAdded) divBox.removeEventListener("click", onClick)
    } else {
        div.textContent = wordsString;
    }

    if (!divBox.dataset.listenerAdded) {
        divBox.addEventListener("click", onClick)
        divBox.dataset.listenerAdded = "true";
    }
}
import { getMonkeytypeLink }          from "/feature/util/text-to-monkeytype-link.js";
import { text } from "/feature/data/text-provider.js";

// limit: how many of the words one Monkeytype test uses (default 10).
export function renderBoxPracticeWords(words, divLabel, idBox, limit) {
    const div = document.getElementById(divLabel);
    const divBox = document.getElementById(idBox);
    const wordsString = words.map(ws => ws.word).join(" ");
    const wordsArray = words.map(ws => ws.word)

    // The click handler is added once, so it reads the current words from
    // the box rather than the ones it was first rendered with.
    divBox._practiceWords = wordsArray;
    divBox._practiceLimit = limit;
    function onClick() {
        const current = divBox._practiceWords;
        if (current.length > 1)
            window.open(getMonkeytypeLink(current, divBox._practiceLimit), "_blank");
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
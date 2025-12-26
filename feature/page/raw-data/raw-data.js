
import { syntaxHighlightJson } from "../../util/syntax-highlight-json.js";

export function renderRawData() {
    chrome.storage.local.get(["records"], (result) => {
        const records_json = result.records || [];
        const records_pretty = syntaxHighlightJson(records_json);
        document.getElementById("dataOutput").innerHTML = records_pretty;

    });
}
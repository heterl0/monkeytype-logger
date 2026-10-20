/* global MTLAnalyzer */
import { getRecords } from "/feature/data/records-provider.js";
import { computePatterns, settingsOf } from "/feature/data/patterns.js";
import { renderBoxPracticeWords } from "/feature/page/box-practice-words.js";

const TYPE_INFO = {
    substitution: "Wrong key, often a neighbouring one",
    transposition: "Two letters swapped (amle… for ameliyat)",
    omission: "A letter skipped (tah… for tarih)",
    insertion: "An extra key, often a later letter typed too early (talbe… for tabela)",
    "early-space": "Space before the word was finished",
    extra: "A letter where the space was expected",
};

const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ch = (c) => (c === " " ? "␣" : c === "\n" ? "⏎" : esc(c));
const pct = (x) => (x * 100).toFixed(1) + "%";
const examples = (words) => esc([...words].slice(0, 5).join(", "));
const ms = (x) => (x == null ? "—" : Math.round(x) + " ms");

function fill(tableId, rows) {
    document.querySelector(`#${tableId} tbody`).innerHTML =
        rows.join("") || `<tr><td colspan="9">No data yet.</td></tr>`;
}

// The filter keeps its choice across re-renders (a new test saved).
let filter = "";

export async function renderPatternsPage() {
    const records = await getRecords();
    const select = document.getElementById("patternFilter");
    const kinds = [...new Set(records.map(settingsOf).filter(Boolean))].sort();
    if (filter && !kinds.includes(filter)) filter = "";
    select.innerHTML = [`<option value="">All tests</option>`]
        .concat(kinds.map((k) => `<option value="${esc(k)}">${esc(k)}</option>`))
        .join("");
    select.value = filter;
    select.onchange = () => {
        filter = select.value;
        renderPatternsPage().catch(console.error);
    };

    const chosen = filter ? records.filter((r) => settingsOf(r) === filter) : records;
    const p = computePatterns(chosen, MTLAnalyzer.analyzeWord);

    document.getElementById("patternTests").textContent = p.tests;
    document.getElementById("patternRate").textContent =
        p.words ? ((p.mistakes / p.words) * 100).toFixed(1) : "—";
    document.getElementById("pauseClean").textContent = ms(p.pauseClean);
    document.getElementById("pauseMistake").textContent = ms(p.pauseMistake);

    renderBoxPracticeWords(
        p.practice.map((word) => ({ word })),
        "practicePatterns",
        "practice-box-patterns"
    );

    fill("typeTable", p.types.map((t) => `<tr>
        <td>${esc(t.type)}</td><td>${t.count}</td><td>${pct(t.count / p.mistakes)}</td>
        <td>${esc(TYPE_INFO[t.type] || "")}</td></tr>`));

    fill("pairTable", p.pairs.slice(0, 15).map((x) => `<tr>
        <td class="mono">${ch(x.e)} → ${ch(x.k)}</td><td>${x.count}</td>
        <td>${examples(x.words)}</td></tr>`));

    fill("contextTable", p.contexts.slice(0, 15).map((x) => `<tr>
        <td class="mono">${ch(x.p)}<b>${ch(x.e)}</b></td><td>${x.count}</td>
        <td>${examples(x.words)}</td></tr>`));

    fill("letterTable", p.letters.slice(0, 15).map((x) => `<tr>
        <td class="mono">${ch(x.ch)}</td><td>${x.seen}</td><td>${x.missed}</td>
        <td>${pct(x.rate)}</td></tr>`));

    fill("pauseTable", p.perTest.slice(-30).reverse().map((t) => `<tr>
        <td>${esc(new Date(t.time).toLocaleString())}</td><td>${esc(t.settings || "—")}</td><td>${t.wpm ?? "—"}</td>
        <td>${t.accuracy != null ? t.accuracy + "%" : "—"}</td><td>${ms(t.pause)}</td></tr>`));
}

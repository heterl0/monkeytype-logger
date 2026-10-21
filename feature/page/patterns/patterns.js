/* global MTLAnalyzer */
import { getRecords } from "/feature/data/records-provider.js";
import { computePatterns, settingsOf } from "/feature/data/patterns.js";
import { renderBoxPracticeWords } from "/feature/page/box-practice-words.js";
import { drillFor } from "/feature/data/drill.js";
import { dailyTrend } from "/feature/data/trend.js";
import { lineChart } from "/feature/util/line-chart.js";

const getWordLists = () =>
    new Promise((resolve) => chrome.storage.local.get(["wordLists"], (r) => resolve(r.wordLists || {})));

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

    // The drill draws from the word list of the tests shown.
    const drill = drillFor(p, chosen, await getWordLists());
    renderBoxPracticeWords(
        drill.words.map((word) => ({ word })),
        "practicePatterns",
        "practice-box-patterns",
        drill.limit
    );
    document.getElementById("drillSource").textContent = drill.fromList
        ? `${drill.words.length} words from ${drill.language} with your weakest letter pairs and letters; each test uses ${drill.limit} of them, shuffled.`
        : "Words you have typed that contain your weakest letter pairs. Type a test on Monkeytype with the extension active so it can save the word list, and the drill will draw from the whole list instead.";

    const days = dailyTrend(p.perTest);
    const short = (d) => d.slice(5).replace("-", ".");
    document.getElementById("trendWpm").innerHTML = lineChart(days.map((d) => ({ x: short(d.day), y: d.wpm })));
    document.getElementById("trendMistakes").innerHTML = lineChart(
        days.map((d) => ({ x: short(d.day), y: d.mistakesPer100 })),
        (v) => v.toFixed(1)
    );
    document.getElementById("trendPause").innerHTML = lineChart(
        days.map((d) => ({ x: short(d.day), y: d.pause })),
        (v) => Math.round(v) + " ms"
    );
    document.getElementById("trendUneven").innerHTML = lineChart(
        days.map((d) => ({ x: short(d.day), y: d.uneven == null ? null : d.uneven * 100 })),
        (v) => Math.round(v) + " %"
    );

    const r = p.rhythm;
    const n = r.tempo.rushed + r.tempo.steady + r.tempo.hesitant;
    document.getElementById("rhythmUneven").textContent = r.uneven == null ? "—" : Math.round(r.uneven * 100) + " %";
    const s = r.syllables;
    document.querySelectorAll(".rhythm-syllables").forEach((el) => (el.hidden = !s));
    if (s) {
        document.getElementById("sylGap").textContent = `${Math.round(s.gapIn)} → ${Math.round(s.gapStart)} ms`;
        document.getElementById("sylMiss").textContent = `${s.missIn.toFixed(1)} → ${s.missStart.toFixed(1)}`;
    }
    document.getElementById("rhythmTempo").textContent = n
        ? `${Math.round((r.tempo.rushed / n) * 100)} % rushed · ${Math.round((r.tempo.hesitant / n) * 100)} % hesitant · ${Math.round((r.tempo.steady / n) * 100)} % at your usual pace`
        : "Not enough data yet.";

    fill("trendTable", days.slice(-30).reverse().map((d) => `<tr>
        <td>${esc(d.day)}</td><td>${d.tests}</td><td>${d.words}</td>
        <td>${d.wpm != null ? Math.round(d.wpm) : "—"}</td>
        <td>${d.mistakesPer100 != null ? d.mistakesPer100.toFixed(1) : "—"}</td>
        <td>${ms(d.pause)}</td>
        <td>${d.uneven != null ? Math.round(d.uneven * 100) + " %" : "—"}</td></tr>`));

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
        <td>${t.accuracy != null ? t.accuracy + "%" : "—"}</td><td>${ms(t.pause)}</td>
        <td>${t.uneven != null ? Math.round(t.uneven * 100) + " %" : "—"}</td></tr>`));
}

// Mistake patterns across all records, re-derived from the stored
// keystrokes with analyzer.js (so records saved by older versions are
// counted the same way). Records without keystrokes (saved before live
// logging) have no positions and are skipped here.

import { median } from "/feature/util/median.js";
import { syllableStarts, usesTurkishSyllables } from "/feature/util/syllables.js";

// Which word list / mode a test used, e.g. "turkish_5k · words 10".
// Records saved before the settings were logged have none.
export const settingsOf = (r) =>
    r.language ? [r.language, [r.mode, r.mode2].filter((x) => x != null).join(" ")].join(" · ") : "";

// A letter's error rate is shown only once it was typed this often.
const MIN_LETTER_SEEN = 10;

// A mistake typed faster than this share of the test's usual gap between
// keys counts as rushed; slower than HESITANT times it, as hesitant.
const RUSHED = 0.75;
const HESITANT = 1.5;

const BACK = "⌫";
const BACK_WORD = "⌫w";
const isBack = (k) => k === BACK || k === BACK_WORD;

// A record's words with their keystrokes. New records store each word's
// index (`w`); in older ones the typed words are the keystroke word indexes
// in order.
function wordsWithKeys(record) {
    const byIdx = new Map();
    for (const ks of record.keystrokes) {
        if (!byIdx.has(ks.w)) byIdx.set(ks.w, []);
        byIdx.get(ks.w).push({ ...ks });
    }
    const typedIdx = [...byIdx.keys()]
        .filter((w) => byIdx.get(w).some((ks) => !isBack(ks.k)))
        .sort((a, b) => a - b);
    return record.words.map((word, n) => {
        const idx = word.w ?? typedIdx[n];
        return { word, idx, keys: byIdx.get(idx) || [] };
    });
}

function countInto(map, key, extra) {
    const e = map.get(key) || { count: 0, words: new Set() };
    e.count++;
    if (extra) e.words.add(extra);
    map.set(key, e);
}

const sortedEntries = (map) =>
    [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count);

export function computePatterns(records, analyzeWord) {
    const types = new Map();
    const pairs = new Map(); // "e\u0000k" -> count, words
    const contexts = new Map(); // "p\u0000e" -> count, words
    const seen = new Map(); // letter -> times it was to be typed
    const missed = new Map(); // letter -> mistakes on it
    const pauseClean = [];
    const pauseMistake = [];
    // Rhythm inside words: the time between keys, the first letter of a
    // word left out (that is the pause, measured above).
    const unevenAll = [];
    const tempo = { rushed: 0, steady: 0, hesitant: 0 };
    // Turkish tests: keys inside a syllable vs. the first key of a new one.
    const syl = { gapIn: [], gapStart: [], keysIn: 0, keysStart: 0, missIn: 0, missStart: 0 };
    const perTest = [];
    const allWords = new Set();
    let tests = 0;
    let wordCount = 0;
    let mistakeCount = 0;

    for (const record of records) {
        if (!Array.isArray(record.keystrokes) || record.keystrokes.length === 0) continue;
        tests++;
        const pauses = [];
        let testWords = 0;
        let testMistakes = 0;
        const bySyllables = usesTurkishSyllables(record);
        const gaps = { in: [], start: [] }; // correct keys inside words
        const mistakeGaps = { in: [], start: [] }; // mistakes inside words
        for (const { word, idx, keys } of wordsWithKeys(record)) {
            const target = word.wordCorrected;
            if (!target || keys.length === 0) continue;
            wordCount++;
            testWords++;
            allWords.add(target);
            const mistakes = analyzeWord(target, keys);
            testMistakes += mistakes.length;
            // Without syllables every key counts as "in".
            const starts = bySyllables ? syllableStarts(target) : new Set();
            const kind = (i) => (starts.has(i) ? "start" : "in");
            for (const ks of keys) {
                if (!isBack(ks.k) && ks.i > 0 && ks.k === ks.e && ks.t > 0) gaps[kind(ks.i)].push(ks.t);
            }
            for (const m of mistakes) if (m.i > 0 && m.t > 0) mistakeGaps[kind(m.i)].push(m.t);
            for (const ch of target) seen.set(ch, (seen.get(ch) || 0) + 1);
            for (const m of mistakes) {
                mistakeCount++;
                countInto(types, m.type);
                countInto(pairs, m.e + "\u0000" + m.k, target);
                countInto(contexts, m.p + "\u0000" + m.e, target);
                missed.set(m.e, (missed.get(m.e) || 0) + 1);
            }
            // The pause before a word's first letter: how long it took to
            // read the word and start it. The test's first word has none.
            const first = keys.find((ks) => !isBack(ks.k) && ks.i === 0);
            if (first && idx > 0 && first.t > 0) {
                pauses.push(first.t);
                (mistakes.length ? pauseMistake : pauseClean).push(first.t);
            }
        }
        // Unevenness: the median distance of a gap from the median gap, as a
        // share of it (robust to the odd long pause). 0 % is a metronome.
        // Measured inside syllables, so the natural step into the next
        // syllable does not count against you.
        let uneven = null;
        if (gaps.in.length >= 10) {
            const med = median(gaps.in);
            uneven = median(gaps.in.map((g) => Math.abs(g - med))) / med;
            unevenAll.push(uneven);
            // Was each mistake typed in a rush (much faster than your usual
            // gap at that kind of spot) or after a hesitation (much slower)?
            for (const k of ["in", "start"]) {
                if (gaps[k].length === 0) continue;
                const usual = median(gaps[k]);
                for (const g of mistakeGaps[k]) {
                    if (g < RUSHED * usual) tempo.rushed++;
                    else if (g > HESITANT * usual) tempo.hesitant++;
                    else tempo.steady++;
                }
            }
        }
        if (bySyllables) {
            syl.gapIn.push(...gaps.in);
            syl.gapStart.push(...gaps.start);
            syl.keysIn += gaps.in.length + mistakeGaps.in.length;
            syl.keysStart += gaps.start.length + mistakeGaps.start.length;
            syl.missIn += mistakeGaps.in.length;
            syl.missStart += mistakeGaps.start.length;
        }
        perTest.push({
            uneven,
            time: record.time,
            settings: settingsOf(record),
            wpm: record.overallWPM,
            accuracy: record.accuracy,
            pause: pauses.length ? median(pauses) : null,
            words: testWords,
            mistakes: testMistakes,
        });
    }

    const letters = [...seen.entries()]
        .filter(([ch]) => ch.trim() !== "")
        .map(([ch, n]) => ({ ch, seen: n, missed: missed.get(ch) || 0 }))
        .map((r) => ({ ...r, rate: r.missed / r.seen }))
        .filter((r) => r.missed > 0 && r.seen >= MIN_LETTER_SEEN)
        .sort((a, b) => b.rate - a.rate || b.missed - a.missed);

    const contextList = sortedEntries(contexts).map(({ key, ...v }) => {
        const [p, e] = key.split("\u0000");
        return { p, e, ...v };
    });

    return {
        tests,
        words: wordCount,
        mistakes: mistakeCount,
        types: sortedEntries(types).map(({ key, count }) => ({ type: key, count })),
        pairs: sortedEntries(pairs).map(({ key, ...v }) => {
            const [e, k] = key.split("\u0000");
            return { e, k, ...v };
        }),
        contexts: contextList,
        letters,
        missedByLetter: Object.fromEntries(missed),
        rhythm: {
            uneven: unevenAll.length ? median(unevenAll) : null,
            tempo,
            // per 100 keys; null without Turkish tests
            syllables: syl.keysIn && syl.keysStart
                ? {
                      gapIn: median(syl.gapIn),
                      gapStart: median(syl.gapStart),
                      missIn: (syl.missIn / syl.keysIn) * 100,
                      missStart: (syl.missStart / syl.keysStart) * 100,
                  }
                : null,
        },
        pauseClean: pauseClean.length ? median(pauseClean) : null,
        pauseMistake: pauseMistake.length ? median(pauseMistake) : null,
        perTest,
        practice: practiceWords(allWords, contextList),
    };
}

// Words you have met that contain your most frequent mistake contexts
// (letter pairs), the ones with the most of them first.
function practiceWords(allWords, contexts, max = 20) {
    const weak = contexts
        .filter((c) => c.p !== " " && c.e !== " " && c.count >= 2)
        .slice(0, 8)
        .map((c) => c.p + c.e);
    if (weak.length === 0) return [];
    return [...allWords]
        .map((w) => ({ word: w, hits: weak.filter((bg) => w.includes(bg)).length }))
        .filter((x) => x.hits > 0)
        .sort((a, b) => b.hits - a.hits || a.word.localeCompare(b.word))
        .slice(0, max)
        .map((x) => x.word);
}

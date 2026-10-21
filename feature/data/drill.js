// A practice test aimed at your weak spots: words from a Monkeytype word
// list (e.g. turkish_5k) that contain the letter pairs and letters you miss
// most. The content script saves the word list of each language you type
// in (`wordLists` in storage).
//
// Each word is scored by the weak pairs and letters it contains, per
// square root of its length (so long words do not win just by being long).
// Words are picked one at a time; after each pick the weights of what it
// covered are lowered, so the drill spreads over several weak spots instead
// of repeating the worst one.

const PAIR_WEIGHT = 1; // per mistake made in that letter pair
const LETTER_WEIGHT = 0.5; // per mistake made on that letter
const DECAY = 0.6; // weight kept by a pair or letter once a word covered it
const MIN_LEN = 3;
const MAX_LEN = 12;

export function buildDrill(patterns, wordList, size = 30) {
    const pairW = new Map();
    for (const c of patterns.contexts) {
        if (c.p !== " " && c.e !== " ") pairW.set(c.p + c.e, c.count * PAIR_WEIGHT);
    }
    const letterW = new Map(
        Object.entries(patterns.missedByLetter || {})
            .filter(([ch]) => ch.trim() !== "")
            .map(([ch, n]) => [ch, n * LETTER_WEIGHT])
    );
    if (pairW.size === 0 && letterW.size === 0) return [];

    let pool = [...new Set(wordList)].filter(
        (w) => w.length >= MIN_LEN && w.length <= MAX_LEN && /^\p{Ll}+$/u.test(w)
    );
    const score = (w) => {
        let s = 0;
        for (let i = 0; i < w.length; i++) {
            s += letterW.get(w[i]) || 0;
            if (i > 0) s += pairW.get(w[i - 1] + w[i]) || 0;
        }
        return s / Math.sqrt(w.length);
    };

    const picked = [];
    while (picked.length < size && pool.length) {
        let best = null;
        let bestScore = 0;
        for (const w of pool) {
            const s = score(w);
            if (s > bestScore) {
                best = w;
                bestScore = s;
            }
        }
        if (!best) break;
        picked.push(best);
        pool = pool.filter((w) => w !== best);
        for (let i = 0; i < best.length; i++) {
            if (letterW.has(best[i])) letterW.set(best[i], letterW.get(best[i]) * DECAY);
            const pair = best[i - 1] + best[i];
            if (i > 0 && pairW.has(pair)) pairW.set(pair, pairW.get(pair) * DECAY);
        }
    }
    return picked;
}

export const DRILL_WORDS = 40; // words in the drill
export const DRILL_TEST = 30; // of which one Monkeytype test uses (shuffled)

// The drill for a set of records and their computed patterns: from the
// word list of the newest record's language when it is saved, otherwise
// from words you have typed. { words, limit, language, fromList }
export function drillFor(patterns, records, wordLists) {
    const language = [...records].reverse().find((r) => r.language)?.language ?? null;
    const list = language ? wordLists[language] : null;
    const fromList = list ? buildDrill(patterns, list, DRILL_WORDS) : [];
    const words = fromList.length ? fromList : patterns.practice;
    return { words, limit: Math.min(DRILL_TEST, words.length), language, fromList: fromList.length > 0 };
}

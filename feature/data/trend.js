// Progress by day, from the per-test figures of computePatterns.

import { median } from "/feature/util/median.js";

const dayOf = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// [{ day, tests, words, mistakesPer100, wpm, pause, uneven }], oldest first.
export function dailyTrend(perTest) {
    const days = new Map();
    for (const t of perTest) {
        const day = dayOf(t.time);
        if (!days.has(day)) days.set(day, []);
        days.get(day).push(t);
    }
    return [...days.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, tests]) => {
            const words = tests.reduce((n, t) => n + t.words, 0);
            const mistakes = tests.reduce((n, t) => n + t.mistakes, 0);
            const wpms = tests.map((t) => t.wpm).filter((x) => typeof x === "number");
            const pauses = tests.map((t) => t.pause).filter((x) => typeof x === "number");
            const uneven = tests.map((t) => t.uneven).filter((x) => typeof x === "number");
            return {
                day,
                tests: tests.length,
                words,
                mistakesPer100: words ? (mistakes / words) * 100 : null,
                wpm: wpms.length ? median(wpms) : null,
                pause: pauses.length ? median(pauses) : null,
                uneven: uneven.length ? median(uneven) : null,
            };
        });
}

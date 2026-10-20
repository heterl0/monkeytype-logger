// analyzer.js — Monkeytype Logger
//
// Turns a word's raw keystrokes into mistakes. Shared by the content script
// (when a test is saved) and the analysis page (which re-derives mistakes
// from the stored keystrokes, so older records benefit from fixes here).
//
// A mistake is counted only where the typed text was still correct up to
// that key. Once a word has gone wrong, every following key sits at a
// shifted position until it is fixed, and counting those would turn one
// extra letter into a mistake on every letter after it.
//
// Each mistake gets a type, from the wrong key and the two keys typed after
// it (up to the next Backspace), whichever reading they fit best:
//   omission       a later letter typed, the expected one skipped
//                  ("tarih": a, then h instead of r)
//   transposition  the next two letters swapped ("ameliyat" as "amle…")
//   insertion      an extra key, then the expected letter
//                  ("tabela" as "talbe…": l typed too early)
//   early-space    space before the word was finished
//   extra          a letter where the space was expected
//   substitution   any other wrong key (often a neighbouring key)

(function (root) {
  const BACK = "⌫"; // Backspace
  const BACK_WORD = "⌫w"; // Ctrl+Backspace

  const isCommit = (k, expected) => k === " " || (k === "\n" && expected === "\n");

  // What each reading predicts for the wrong key and the two after it,
  // as offsets into the target (null: any key). The first reading that
  // matches the most of the keys we have wins.
  const READINGS = [
    ["transposition", [1, 0, 2]],
    ["omission", [1, 2, 3]], // one letter skipped
    ["omission", [2, 3, 4]], // two letters skipped
    ["insertion", [null, 0, 1]],
    ["substitution", [null, 1, 2]],
  ];

  // typed: the wrong key followed by up to two more keys.
  function classify(target, i, typed) {
    const expected = target[i];
    if (expected === undefined || expected === "\n") return "extra";
    if (typed[0] === " " || typed[0] === "\n") return "early-space";
    const at = (j) => (j < target.length && target[j] !== "\n" ? target[j] : " ");
    let best = "substitution";
    let bestScore = 0;
    for (const [type, offsets] of READINGS) {
      let score = 0;
      let fits = true;
      typed.forEach((k, j) => {
        const o = offsets[j];
        if (o === null) return;
        if (k === at(i + o)) score++;
        else fits = false;
      });
      if (fits && score > bestScore) {
        best = type;
        bestScore = score;
      }
    }
    return best;
  }

  // The wrong key at keys[j] and up to two keys after it, stopping at a
  // Backspace.
  function typedFrom(keys, j) {
    const out = [keys[j].k];
    for (let n = j + 1; n < keys.length && out.length < 3; n++) {
      const k = keys[n].k;
      if (k === BACK || k === BACK_WORD) break;
      out.push(k);
    }
    return out;
  }

  // keys: [{ k, t, ... }] in typing order. Sets each key's position `i` and
  // expected char `e`, and returns the mistakes { i, e, k, p, n, t, type }
  // (p / n: the letters before / after the expected one, " " at a word edge).
  //
  // A Backspace right after the word's committing space is the jump back
  // into this word from the next one: Monkeytype moves the cursor back and
  // deletes nothing.
  function analyzeWord(target, keys) {
    const mistakes = [];
    let buf = "";
    let committed = false;
    keys.forEach((ks, j) => {
      const i = buf.length;
      const expected = i < target.length ? target[i] : " ";
      ks.i = i;
      ks.e = expected;
      if (ks.k === BACK || ks.k === BACK_WORD) {
        if (ks.k === BACK_WORD) buf = "";
        else if (!committed) buf = buf.slice(0, -1);
        committed = false;
        return;
      }
      const ok = ks.k === expected || (ks.k === " " && expected === "\n");
      if (!ok && target.startsWith(buf)) {
        mistakes.push({
          i,
          e: expected,
          k: ks.k,
          p: i === 0 ? " " : target[i - 1] ?? " ",
          n: i < target.length ? target[i + 1] ?? " " : " ",
          t: ks.t,
          type: classify(target, i, typedFrom(keys, j)),
        });
      }
      if (isCommit(ks.k, expected)) committed = true;
      else buf += ks.k;
    });
    return mistakes;
  }

  const api = { analyzeWord, classify, BACK, BACK_WORD };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MTLAnalyzer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);

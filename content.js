// content.js — Monkeytype Logger
//
// Records every keystroke while a test runs, instead of scraping the result
// screen afterwards. Monkeytype rewrote its result page (letter states are now
// utility classes such as `text-error`, word speeds are no longer attributes),
// and a mistake you fixed with Backspace never reaches the result screen at
// all. Logging live keeps that information:
//
//   keystrokes: [{ w, i, e, k, t }]  word index, position in the word,
//                                 expected char, typed key ("⌫" Backspace,
//                                 "⌫w" delete word), ms since the previous
//                                 keystroke
//   words:      [{ w, word, wordCorrected, reason, wpm, mistakes }]
//   mistakes:   [{ i, e, k, p, n, t, type }]  position in the word
//                                 (0-based), expected, typed, the letter
//                                 before and after the expected one (" " at
//                                 a word edge), ms since the previous
//                                 keystroke, and the kind of mistake (see
//                                 analyzer.js). In "kanat", missing the
//                                 second "a" is { i: 3, e: "a", p: "n",
//                                 n: "t" }.
//
// `word`, `wordCorrected`, `reason` and `wpm` keep the original record format,
// so the popup and the analysis pages keep working.
//
// Our own input buffer, not the DOM, tracks progress: Monkeytype redraws the
// active word on the next animation frame, so two quick keystrokes can both
// land before the DOM catches up.
//
// For the same reason a word's target text read at its first keystroke can
// be stale (start typing during the restart fade and the old words are still
// on screen). So keystrokes are stored raw, the target is re-read on each of
// the word's keystrokes, and `e`, `i` and the mistakes are derived from the
// final target only when the test is saved (analyzer.js).

(() => {
  const LOG = (...a) => console.log("MonkeyType Logger:", ...a);

  // The DOM may trail our own state by a frame or two while typing. Only
  // trust it over our state after a pause this long (a restart or a jump
  // back into an earlier word always comes after one).
  const DOM_TRUST_MS = 150;

  // ---- per-test state -----------------------------------------------------
  let keystrokes = [];
  let words = new Map(); // word index -> { target, typed, keys, firstT, lastT }
  let wordIdx = 0;
  let input = "";
  let lastT = null;
  let saved = false;
  let resultSeenAt = null; // when the result screen appeared for this test

  function resetTest() {
    keystrokes = [];
    words = new Map();
    wordIdx = 0;
    input = "";
    lastT = null;
    saved = false;
    resultSeenAt = null;
    cfg = readConfig();
  }

  // ---- DOM helpers --------------------------------------------------------
  const activeWordEl = () => document.querySelector("#words .word.active");

  const indexOf = (el) => Number(el?.getAttribute("data-wordindex") ?? NaN);

  // Letters of the target word (not over-typed extras or decorations).
  const targetLetters = (el) =>
    Array.from(el.querySelectorAll("letter")).filter(
      (l) =>
        !l.classList.contains("extra") &&
        !l.classList.contains("invisible") &&
        !l.classList.contains("dead")
    );

  const typedCount = (el) =>
    targetLetters(el).filter(
      (l) => l.classList.contains("correct") || l.classList.contains("incorrect")
    ).length + el.querySelectorAll("letter.extra").length;

  function targetOf(idx) {
    const el = document.querySelector(`#words .word[data-wordindex="${idx}"]`);
    if (!el) return "";
    const nl = el.querySelector("letter.nlChar") ? "\n" : "";
    return (
      targetLetters(el)
        .filter(
          (l) => !l.classList.contains("nlChar") && !l.classList.contains("tabChar")
        )
        .map((l) => l.textContent)
        .join("") + nl
    );
  }

  function wordState(idx) {
    let w = words.get(idx);
    if (!w) {
      // Read when the word is first reached, before any of it is typed, so
      // the letters still show the target text.
      w = { target: targetOf(idx), typed: "", keys: [], firstT: null, lastT: null };
      words.set(idx, w);
    }
    return w;
  }

  // Monkeytype mounts #result only while the result screen is shown.
  const resultShown = () => !!document.getElementById("result");

  // Is this keystroke typing into the test? Monkeytype types into
  // #wordsInput. When that input has lost focus, Monkeytype's own handler
  // refocuses it on the key press and types the key, so a key with nothing
  // else focused counts too, unless the result screen is up.
  function typingActive() {
    const inputEl = document.getElementById("wordsInput");
    if (!inputEl || !document.querySelector("#words")) return false;
    // the test area is hidden behind the result screen
    if (document.getElementById("typingTest")?.classList.contains("hidden")) return false;
    const a = document.activeElement;
    if (a === inputEl) return true;
    const otherField =
      a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
    return !otherField && !resultShown();
  }

  // ---- keystroke capture --------------------------------------------------
  function syncWithDom(now) {
    // The result screen came and went (a quick restart) before its stats
    // were rendered: save the test now, without them.
    if (resultSeenAt !== null && !saved) save();
    if (saved) {
      // first keystroke after a saved result: a new test
      resetTest();
    }
    const paused = lastT === null || now - lastT > DOM_TRUST_MS;
    if (!paused) return;

    const el = activeWordEl();
    const domIdx = indexOf(el);
    if (Number.isNaN(domIdx)) return;

    // A restart: word 0 active and nothing typed, while we had progress.
    if (domIdx === 0 && typedCount(el) === 0 && (wordIdx > 0 || input !== "")) {
      LOG("restart detected, discarding the unfinished test");
      resetTest();
      return;
    }
    if (domIdx === wordIdx) return;

    // Follow the DOM (e.g. Backspace back into a previous word).
    wordIdx = domIdx;
    const w = wordState(domIdx);
    input = w.typed.slice(0, typedCount(el));
  }

  // `e` and `i` are provisional here; `replay` sets the final values.
  function record(w, expected, key, now) {
    const t = lastT === null ? 0 : Math.round(now - lastT);
    lastT = now;
    const ks = { w: wordIdx, i: input.length, e: expected, k: key, t };
    keystrokes.push(ks);
    w.keys.push(ks);
  }

  // Monkeytype's own settings that change what a key does, read once per
  // test from its saved config.
  //   typosReplace: with "indicate typos: replace/both" a mistyped letter
  //     shows the typed key instead of the target, so the target can only be
  //     trusted before the word is typed.
  //   backIntoWords / backspace: whether Backspace on an empty word goes back
  //     into the previous one (only if that word is wrong, or always in
  //     freedom mode; never in confidence mode), and whether Backspace works
  //     at all ("max" confidence mode).
  function readConfig() {
    let c = {};
    try {
      c = JSON.parse(localStorage.getItem("config") || "{}") || {};
    } catch {}
    return {
      typosReplace: c.indicateTypos === "replace" || c.indicateTypos === "both",
      freedom: c.freedomMode === true,
      backIntoWords: c.confidenceMode !== "on" && c.confidenceMode !== "max",
      backspace: c.confidenceMode !== "max",
    };
  }
  let cfg = readConfig();

  // The test's settings (language, mode, length, ...) from Monkeytype's
  // config, read when the test is saved, so 1k and 5k word lists can be told
  // apart later.
  function readTestSettings() {
    let c = {};
    try {
      c = JSON.parse(localStorage.getItem("config") || "{}") || {};
    } catch {}
    const length = { time: c.time, words: c.words, quote: c.quoteLength }[c.mode];
    return {
      language: c.language ?? null,
      mode: c.mode ?? null,
      mode2: Array.isArray(length) ? length.join(",") : length ?? null,
      punctuation: c.punctuation ?? null,
      numbers: c.numbers ?? null,
    };
  }

  // Re-read a word's target, so a stale first read (old words still on
  // screen during a restart) is replaced once the screen has caught up.
  function refreshTarget(idx) {
    if (cfg.typosReplace) return;
    const fresh = targetOf(idx);
    if (fresh) words.get(idx).target = fresh;
  }

  function onKeyDown(ev) {
    if (!typingActive()) return;
    if (ev.metaKey || (ev.altKey && !ev.ctrlKey)) return; // AltGr = Ctrl+Alt
    const now = performance.now();
    syncWithDom(now);

    const w = wordState(wordIdx);
    refreshTarget(wordIdx);
    const target = w.target;
    const expected = input.length < target.length ? target[input.length] : " ";

    if (ev.key === "Backspace") {
      if (!cfg.backspace) return;
      const ctrl = ev.ctrlKey && !ev.altKey;
      let cur = w;
      if (input === "") {
        // Back into the previous word: Monkeytype restores what was typed
        // there and deletes nothing (Ctrl+Backspace clears that word). The
        // key is recorded in that word, where analyzer.js reads a Backspace
        // right after the committing space as this jump.
        const prev = words.get(wordIdx - 1);
        if (!prev || !cfg.backIntoWords) return;
        if (!cfg.freedom && prev.typed === prev.target.replace(/\n$/, "")) return;
        wordIdx -= 1;
        cur = prev;
        input = ctrl ? "" : prev.typed;
      } else {
        input = ctrl ? "" : input.slice(0, -1);
      }
      record(cur, expected, ctrl ? "⌫w" : "⌫", now);
      cur.typed = input;
      return;
    }

    let key = ev.key;
    if (key === "Enter") key = "\n";
    if (key.length !== 1 && key !== "\n") return; // Shift, Tab, arrows, ...
    if (ev.ctrlKey && !ev.altKey) return; // shortcuts, not typing

    // Space on an empty word does nothing in Monkeytype.
    if ((key === " " || key === "\n") && input === "") return;

    // A word's time starts at the previous keystroke (normally the space
    // that ended the word before it), like Monkeytype's burst speed.
    if (w.firstT === null) w.firstT = lastT ?? now;
    record(w, expected, key, now);
    w.lastT = now;

    if (key === " " || (key === "\n" && expected === "\n")) {
      w.typed = input; // word committed
      wordIdx += 1;
      input = "";
    } else {
      input += key;
      w.typed = input;
    }
  }

  document.addEventListener("keydown", onKeyDown, true);

  // ---- result -------------------------------------------------------------
  function readStat(i) {
    const els = document.querySelectorAll('[data-ui-element="resultStatValue"]');
    const txt = els[i]?.textContent ?? "";
    const n = parseFloat(txt.replace(",", ".").replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function buildRecord() {
    const out = [];
    for (const idx of [...words.keys()].sort((a, b) => a - b)) {
      const w = words.get(idx);
      if (w.firstT === null) continue; // never typed
      const mistakes = globalThis.MTLAnalyzer.analyzeWord(w.target, w.keys);
      const target = w.target.replace(/\n$/, "");
      const typed = w.typed;
      const reason =
        typed !== target ? "error" : mistakes.length > 0 ? "corrected" : "correct";
      // Word speed like Monkeytype's burst: characters incl. the space, from
      // the keystroke before the word to its last keystroke.
      let wpm = null;
      const ms = w.lastT - w.firstT;
      if (ms > 0 && typed.length > 0) {
        wpm = Math.round((typed.length + 1) / 5 / (ms / 60000));
      }
      out.push({ w: idx, word: typed, wordCorrected: target, reason, wpm, mistakes });
    }
    return {
      id: Date.now(),
      time: new Date().toISOString(),
      overallWPM: readStat(0),
      accuracy: readStat(1),
      ...readTestSettings(),
      words: out,
      keystrokes,
    };
  }

  function save() {
    if (saved || keystrokes.length === 0) return;
    const rec = buildRecord();
    if (rec.words.length === 0) return;
    saved = true;
    LOG(
      `saving test: ${rec.words.length} words, ${rec.keystrokes.length} keystrokes,`,
      `${rec.overallWPM} wpm, ${rec.accuracy}% acc`
    );
    try {
      chrome.runtime.sendMessage({ action: "saveRecord", record: rec }, (res) => {
        if (chrome.runtime.lastError || !res) {
          console.error("MonkeyType Logger: save failed", chrome.runtime.lastError);
          toast("Monkeytype Logger: test not saved", true);
        } else if (res.success) {
          toast(`Monkeytype Logger: test saved (${res.recordCount})`);
        } else if (res.reason !== "deactivated") {
          toast(`Monkeytype Logger: test not saved (${res.reason})`, true);
        }
      });
    } catch (e) {
      // The extension was reloaded or updated while this tab stayed open:
      // this copy of the script is cut off and can no longer save.
      console.error(
        "MonkeyType Logger: extension was reloaded, refresh this tab (F5) to log again",
        e
      );
      toast("Monkeytype Logger was updated: refresh this tab (F5) to keep logging", true);
    }
  }

  // A short note in the corner, so a test that was not logged is noticed
  // right away.
  function toast(text, warn = false) {
    document.getElementById("mtl-toast")?.remove();
    const el = document.createElement("div");
    el.id = "mtl-toast";
    el.textContent = text;
    Object.assign(el.style, {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      zIndex: 99999,
      padding: "8px 14px",
      borderRadius: "6px",
      font: "13px sans-serif",
      color: "#fff",
      background: warn ? "#b3412f" : "#2f6f4f",
      opacity: "0.9",
      transition: "opacity 0.4s",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), warn ? 5000 : 2000);
    setTimeout(() => el.remove(), warn ? 5500 : 2500);
  }

  // Notice the result screen the moment it is mounted, however briefly it
  // stays: with a quick restart it can be gone within a few hundred ms.
  new MutationObserver(() => {
    if (resultSeenAt === null && keystrokes.length > 0 && resultShown()) {
      resultSeenAt = performance.now();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  // Save once the result stats are rendered (they are drawn a little after
  // the screen appears), or after 2 s without them. A quick restart saves
  // earlier, from syncWithDom.
  const STATS_WAIT_MS = 2000;
  setInterval(() => {
    if (saved || resultSeenAt === null) return;
    if (readStat(0) !== null || performance.now() - resultSeenAt > STATS_WAIT_MS) save();
  }, 100);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "debugTrigger") {
      save();
      sendResponse({ success: true });
    }
  });

  LOG("live keystroke logging active");
})();

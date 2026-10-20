# Monkeytype Logger Extension

![Frame 2](https://github.com/user-attachments/assets/c2d8ad26-bc21-40e0-901b-262c96b1e4d7)


This extension logs errors and corrected words from your Monkeytype tests to track progress over time.

## Publish Extension

The extension is published on Microsoft Edge Add-ons:
[Monkeytype History Logger](https://microsoftedge.microsoft.com/addons/detail/monkeytype-history-logger/ophgnpohledibffckhpabdcciniinnjo).

## Installation

1. In Chrome, enable developer mode.
2. Load this folder as an unpacked extension.

## Features

- Identifies slow and mistyped words for targeted practice
- Logs all words typed in Monkeytype
- Supports exporting logs as JSON-file

## What is recorded

Every keystroke of a test is logged live, so mistakes you fixed with
Backspace are kept too. Each saved test has:

- `words`: each typed word with `reason` (`correct`, `corrected`: fixed with
  Backspace, `error`: left wrong), its speed (`wpm`) and its `mistakes`.
- `mistakes`: where in the word (`i`, 0-based), the expected (`e`) and typed
  (`k`) key, the letters before (`p`) and after (`n`) the expected one, the
  time since the previous key (`t`, ms) and the kind of mistake (`type`:
  substitution, transposition, omission, insertion, early-space, extra).
  Only the first wrong key of a run counts; the keys after it are shifted
  until it is fixed.
- `keystrokes`: every key with its word, position, expected key and timing.
- The test's settings from Monkeytype's config: `language`, `mode`,
  `mode2` (word count or seconds), `punctuation`, `numbers`.

A short note in the corner of Monkeytype confirms each saved test (or says
why it was not saved), and the toolbar badge shows how many tests are saved.

The **Mistake Patterns** page of the analysis view sums these up: kinds of
mistakes, wrong-key pairs (such as `ğ → p`), the letter pairs where you miss
most, per-letter error rates, the pause before each word (it drops when you
read the next word while typing the current one), and a practice link with
words that contain your weakest letter pairs. It can be limited to one word
list or mode (say, `turkish_5k`).

## Monkeytype Settings

Make sure "always show words history" is enabled in your Monkeytype account settings
to better track typed words in your logs.

## Analysis Setup

1. Install Python requirements:
   ```
   pip install -r requirements.txt
   ```
2. Place `monkeytype_data.json` into the `monkeytype-analysis` folder.
3. Run the analysis:
   ```
   python typing-error-analysis.py
   ```
   or open `typing-error-analysis-notebook.ipynb` in Jupyter.

## License

See [LICENSE](./LICENSE).

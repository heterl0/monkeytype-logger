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

- Logs error or corrected words
- Allows downloading logs as JSON

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

import {median} from "/feature/util/median.js";
import {WordStatistic} from "/feature/data/word-statistic-class.js";

export async function getRecords() {
    return new Promise((resolve) => {
        chrome.storage.local.get(["records"], (result) => {
            resolve(result.records || []);
        });
    });
}

async function getWordStatistics() {
    const records = await getRecords();
    const word_statistics = {};

    records.forEach(record => {
        record.words.forEach(wordInfo => {
            const word = wordInfo.wordCorrected;
            const isMistake = wordInfo.reason === "corrected";
            const wpm = wordInfo.wpm;
            if (!word_statistics[word]) {
                word_statistics[word] = new WordStatistic(word);
            }
            word_statistics[word].add_speed(wpm, isMistake);
        });
    });
    return word_statistics;
}

export async function getSlowWords(min_wpm_speeds) {
    const word_statistics = await getWordStatistics();
    const word_statistics_array = Object.values(word_statistics);
    return word_statistics_array
        .filter(ws => ws.wpm_speeds_correct.length >= min_wpm_speeds)
        .sort((a, b) => median(a.wpm_speeds_correct) - median(b.wpm_speeds_correct));
}

export async function getMistakeWords(min_count_mistakes) {
    const word_statistics = await getWordStatistics();
    const word_statistics_array = Object.values(word_statistics);
    return word_statistics_array
        .filter(ws => ws.count_mistakes >= min_count_mistakes)
        .sort((a, b) => (b.count_mistakes / b.count_total) - (a.count_mistakes / a.count_total));

    // .filter(ws => ws.count_total >= min_count_mistakes)
}
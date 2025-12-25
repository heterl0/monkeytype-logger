import { getRecords} from "/feature/data/records-provider.js";

export async function renderStatistics(){
    const records = await getRecords();
    let count_words_unique = new Set();
    let count_words_total = 0;

    records.forEach(record => {
        record.words.forEach(w => {
            if (w.wordCorrected) count_words_unique.add(w.wordCorrected);
            count_words_total++;
        });
    });
    document.getElementById("uniqueWords").textContent = count_words_unique.size;
    document.getElementById("totalWords").textContent = count_words_total;

}

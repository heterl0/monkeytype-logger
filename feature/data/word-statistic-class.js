export class WordStatistic {
    constructor(word) {
        this.word = word;
        this.count_total = 0;
        this.count_mistakes = 0;
        this.wpm_speeds_all = [];
        this.wpm_speeds_correct = [];
    }

    add_speed(wpm, is_mistake) {
        this.count_total++;
        if (is_mistake) this.count_mistakes++;
        if (typeof wpm === "number") {
            this.wpm_speeds_all.push(wpm);
            if (!is_mistake) this.wpm_speeds_correct.push(wpm);
        }
    }

    get mistake_rate() {
        return this.count_total > 0 ? this.count_mistakes / this.count_total : 0;
    }
}
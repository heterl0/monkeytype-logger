// Turkish syllables: every syllable has one vowel, and a consonant right
// before a vowel starts a new syllable (ka-pı, kan-dı-rıl-mak, a-me-li-yat).
// Typists type a syllable as one quick movement and slow down a little
// going into the next one, so the analysis keeps the two apart.

const VOWELS = new Set("aeıioöuüâîû");
const TURKISH_LETTERS = /[çğıöşü]/;

// Positions (> 0) where a new syllable starts.
export function syllableStarts(word) {
    const starts = new Set();
    const w = word.toLocaleLowerCase("tr");
    for (let i = 1; i < w.length; i++) {
        if (!VOWELS.has(w[i])) continue;
        if (!VOWELS.has(w[i - 1])) {
            if (i - 1 > 0) starts.add(i - 1); // consonant + vowel
        } else {
            starts.add(i); // vowel after vowel (sa-at)
        }
    }
    return starts;
}

// The rule is Turkish; use it for Turkish tests (or older records without
// a language whose words have Turkish letters).
export function usesTurkishSyllables(record) {
    if (record.language) return record.language.startsWith("turkish");
    return record.words.some((w) => TURKISH_LETTERS.test(w.wordCorrected || ""));
}

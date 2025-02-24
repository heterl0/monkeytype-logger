// content.js

// Wait for the target element to be available
function waitForElement(selector, callback) {
  const el = document.querySelector(selector);
  if (el) {
    callback(el);
  } else {
    setTimeout(() => waitForElement(selector, callback), 500);
  }
}

waitForElement("#resultWordsHistory", (resultElem) => {
  const observer = new MutationObserver((mutations) => {
    // When the element is updated (i.e. after a test), process the result
    processTestResult();
  });
  observer.observe(resultElem, { childList: true, subtree: true });
});

function processTestResult() {
  const wordsContainer = document.querySelector("#resultWordsHistory .words");
  if (!wordsContainer) return;
  const wordElements = wordsContainer.querySelectorAll(".word");
  const wordsData = [];

  wordElements.forEach((wordElem) => {
    // Get the word text from an attribute (or reconstruct from letters)
    // let word = wordElem.getAttribute("input") || wordElem.textContent.trim();
    const allChildren = wordElem.querySelectorAll("*");
    let word =
      Array.from(allChildren)
        .map((el) => el.textContent)
        .join("") || wordElem.textContent.trim();
    let reason = "";
    // Detect if the word is marked as an error
    if (wordElem.classList.contains("error")) {
      reason = "error";
    } else if (
      wordElem.querySelector(".corrected") ||
      wordElem.querySelector(".incorrect")
    ) {
      // In some cases the word may have a mix of corrected letters
      reason = "corrected";
    } else {
      // Skip words that are completely correct if you want to log only errors/corrections
      return;
    }
    if ((reason === "error" || reason === "corrected") && word.length >= 20) {
      // Skip overly long words
      return;
    }
    wordsData.push({ word, reason });
  });

  if (wordsData.length === 0) return; // nothing to log

  // Create a record with an id (using timestamp) and the current date/time.
  const record = {
    id: Date.now(),
    time: new Date().toISOString(),
    words: wordsData,
  };

  // Send the record to the background script for storage
  chrome.runtime.sendMessage({ action: "saveRecord", record });
}

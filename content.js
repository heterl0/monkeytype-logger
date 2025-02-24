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

// Listen for messages from the background to show a toast
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showToast" && message.message) {
    showToast(message.message);
  }
});

function showToast(text) {
  // Create a container if not already available
  let toastContainer = document.getElementById("my-extension-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "my-extension-toast-container";
    toastContainer.style.position = "fixed";
    toastContainer.style.bottom = "20px";
    toastContainer.style.right = "20px";
    toastContainer.style.zIndex = "10000";
    document.body.appendChild(toastContainer);
  }

  // Create the toast element
  const toast = document.createElement("div");
  toast.textContent = text;
  toast.style.background = "rgba(0, 0, 0, 0.8)";
  toast.style.color = "#fff";
  toast.style.padding = "10px 20px";
  toast.style.marginTop = "10px";
  toast.style.borderRadius = "5px";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
  toast.style.opacity = "1";
  toastContainer.appendChild(toast);

  // Fade out and remove after 3 seconds
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

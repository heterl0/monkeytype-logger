// content.js

// Add debugging to help identify issues
console.log("MonkeyType Logger: Content script loaded");

// Wait for the target element to be available
function waitForElement(selector, callback, maxAttempts = 20) {
  const el = document.querySelector(selector);
  if (el) {
    console.log("MonkeyType Logger: Found element", selector);
    callback(el);
  } else if (maxAttempts > 0) {
    console.log(
      "MonkeyType Logger: Waiting for element",
      selector,
      "attempts left:",
      maxAttempts
    );
    setTimeout(() => waitForElement(selector, callback, maxAttempts - 1), 500);
  } else {
    console.error("MonkeyType Logger: Failed to find element", selector);
  }
}

// Try multiple possible selectors for the results container
function findResultsContainer() {
  const possibleSelectors = [
    "#resultWordsHistory",
    ".resultWordsHistory",
    "[data-testid='resultWordsHistory']",
    ".words",
    "#words",
    ".result .words",
  ];

  for (const selector of possibleSelectors) {
    const el = document.querySelector(selector);
    if (el) {
      console.log(
        "MonkeyType Logger: Found results container with selector:",
        selector
      );
      return el;
    }
  }

  // If no specific container found, look for any element with word elements
  const wordElements = document.querySelectorAll(
    '.word, [class*="word"], .letter, [class*="letter"]'
  );
  if (wordElements.length > 0) {
    console.log(
      "MonkeyType Logger: Found word elements, using parent container"
    );
    return wordElements[0].parentElement;
  }

  return null;
}

// Function to wait for individual WPM data to become available
function waitForIndividualWPMData(wordElements, maxWaitTime = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    function checkForWPMData() {
      // Check if any word elements have WPM data
      let hasWPMData = false;
      let wpmDataCount = 0;

      for (const wordElem of wordElements) {
        const wpm = extractIndividualWPM(wordElem);
        if (wpm) {
          hasWPMData = true;
          wpmDataCount++;
        }
      }

      console.log(
        "MonkeyType Logger: WPM data check - found",
        wpmDataCount,
        "words with WPM data out of",
        wordElements.length
      );

      // Consider data available if we have WPM for at least 25% of words or timeout reached
      const hasEnoughData =
        wpmDataCount > 0 &&
        (wpmDataCount >= wordElements.length * 0.25 ||
          Date.now() - startTime > maxWaitTime);

      if (hasEnoughData) {
        console.log(
          "MonkeyType Logger: WPM data check completed, has sufficient data:",
          hasWPMData
        );
        resolve(hasWPMData);
      } else {
        // Check again in 200ms
        setTimeout(checkForWPMData, 200);
      }
    }

    checkForWPMData();
  });
}

// Function to extract individual WPM data for each word
function extractIndividualWPM(wordElement) {
  // Extract WPM from the 'burst' attribute (this is the individual word WPM)
  const burstAttr = wordElement.getAttribute("burst");
  if (burstAttr) {
    const wpm = parseFloat(burstAttr);
    if (!isNaN(wpm)) {
      console.log("MonkeyType Logger: Found WPM from burst attribute:", wpm);
      return wpm;
    }
  }

  // Fallback: Try to get WPM from data attributes
  const wpmAttr =
    wordElement.getAttribute("data-wpm") ||
    wordElement.getAttribute("wpm") ||
    wordElement.getAttribute("data-individual-wpm");

  if (wpmAttr) {
    const wpm = parseFloat(wpmAttr);
    if (!isNaN(wpm)) {
      return wpm;
    }
  }

  // Look for WPM in child elements or tooltip data
  const wpmElement = wordElement.querySelector(
    '[data-wpm], .wpm, [class*="wpm"]'
  );
  if (wpmElement) {
    const wpmText = wpmElement.textContent || wpmElement.innerText || "";
    const wpmMatch = wpmText.match(/(\d+(?:\.\d+)?)/);
    if (wpmMatch) {
      return parseFloat(wpmMatch[1]);
    }
  }

  // Check for WPM in title attribute (common for tooltips)
  const titleAttr = wordElement.getAttribute("title");
  if (titleAttr) {
    const wpmMatch =
      titleAttr.match(/wpm[:\s]*(\d+(?:\.\d+)?)/i) ||
      titleAttr.match(/(\d+(?:\.\d+)?)\s*wpm/i);
    if (wpmMatch) {
      return parseFloat(wpmMatch[1]);
    }
  }

  return null;
}

// Function to simulate hover and extract WPM tooltip data
function getWPMFromHover(wordElement) {
  return new Promise((resolve) => {
    // Create a temporary event to trigger any hover-based tooltips
    const mouseenterEvent = new MouseEvent("mouseenter", {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    const mouseleaveEvent = new MouseEvent("mouseleave", {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    // Trigger mouseenter
    wordElement.dispatchEvent(mouseenterEvent);

    // Wait a bit for any tooltips to appear
    setTimeout(() => {
      // Look for tooltips or popups that might contain WPM data
      const tooltips = document.querySelectorAll(
        '.tooltip, .popup, [class*="tooltip"], [class*="popup"], [data-tooltip]'
      );
      let wpmValue = null;

      for (const tooltip of tooltips) {
        const tooltipText = tooltip.textContent || tooltip.innerText || "";
        // Look for WPM patterns in tooltip text
        const wpmMatch =
          tooltipText.match(/wpm[:\s]*(\d+(?:\.\d+)?)/i) ||
          tooltipText.match(/(\d+(?:\.\d+)?)\s*wpm/i);
        if (wpmMatch) {
          wpmValue = parseFloat(wpmMatch[1]);
          break;
        }
      }

      // Also check if the word element itself has updated with WPM data
      if (!wpmValue) {
        wpmValue = extractIndividualWPM(wordElement);
      }

      // Trigger mouseleave
      wordElement.dispatchEvent(mouseleaveEvent);

      resolve(wpmValue);
    }, 100);
  });
}

// Function to extract WPM data from the test summary
function extractWPMData() {
  console.log("MonkeyType Logger: Extracting WPM data");

  // Try multiple selectors for WPM information
  const wpmSelectors = [
    '[data-testid="wpm"]',
    ".wpm",
    ".stats .wpm",
    ".result .wpm",
    ".summary .wpm",
    '[class*="wpm"]',
  ];

  let wpmElement = null;
  for (const selector of wpmSelectors) {
    wpmElement = document.querySelector(selector);
    if (wpmElement) {
      console.log(
        "MonkeyType Logger: Found WPM element with selector:",
        selector
      );
      break;
    }
  }

  if (wpmElement) {
    const wpmText = wpmElement.textContent || wpmElement.innerText || "";
    const wpmMatch = wpmText.match(/(\d+(?:\.\d+)?)/);
    if (wpmMatch) {
      const wpm = parseFloat(wpmMatch[1]);
      console.log("MonkeyType Logger: Extracted WPM:", wpm);
      return wpm;
    }
  }

  // If no WPM found, try to extract from other summary elements
  const summaryElements = document.querySelectorAll(
    '.stats, .summary, .result, [class*="stat"], [class*="summary"]'
  );
  for (const element of summaryElements) {
    const text = element.textContent || element.innerText || "";
    const wpmMatch = text.match(/wpm[:\s]*(\d+(?:\.\d+)?)/i);
    if (wpmMatch) {
      const wpm = parseFloat(wpmMatch[1]);
      console.log("MonkeyType Logger: Extracted WPM from summary:", wpm);
      return wpm;
    }
  }

  console.log("MonkeyType Logger: No WPM data found");
  return null;
}

// Initialize when DOM is ready
function initializeLogger() {
  const resultsContainer = findResultsContainer();

  if (resultsContainer) {
    console.log(
      "MonkeyType Logger: Initializing observer on results container"
    );

    const observer = new MutationObserver((mutations) => {
      console.log("MonkeyType Logger: DOM mutation detected");
      // Add a small delay to ensure the DOM is fully updated
      setTimeout(() => processTestResult(), 100);
    });

    observer.observe(resultsContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "burst", "data-wpm", "data-individual-wpm"],
    });

    // Also try to process immediately in case results are already there
    setTimeout(() => processTestResult(), 500);
  } else {
    console.log(
      "MonkeyType Logger: No results container found, retrying in 1 second"
    );
    setTimeout(initializeLogger, 1000);
  }
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLogger);
} else {
  initializeLogger();
}

// Add message listener for debug triggers from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "debugTrigger") {
    console.log("MonkeyType Logger: Debug trigger received");
    processTestResult();
    sendResponse({ success: true });
  }
});

async function processTestResult() {
  console.log("MonkeyType Logger: Processing test result");

  // Extract overall WPM data first
  const overallWPM = extractWPMData();

  // Try multiple selectors for the words container
  const possibleWordSelectors = [
    "#resultWordsHistory .words",
    ".resultWordsHistory .words",
    ".words",
    "#words",
    ".result .words",
    "[class*='word']",
  ];

  let wordsContainer = null;
  for (const selector of possibleWordSelectors) {
    wordsContainer = document.querySelector(selector);
    if (wordsContainer) {
      console.log(
        "MonkeyType Logger: Found words container with selector:",
        selector
      );
      break;
    }
  }
  if (!wordsContainer) {
    console.log("MonkeyType Logger: No words container found");
    return;
  }

  // Try multiple selectors for word elements
  const wordElements = wordsContainer.querySelectorAll(
    ".word, [class*='word'], .letter, [class*='letter']"
  );
  console.log("MonkeyType Logger: Found", wordElements.length, "word elements");

  if (wordElements.length === 0) {
    console.log("MonkeyType Logger: No word elements found");
    return;
  }

  // Wait for individual WPM data to become available
  console.log("MonkeyType Logger: Waiting for individual WPM data...");

  // Try both approaches: mutation observer and polling
  const [observerResult, pollingResult] = await Promise.race([
    observeForWPMData(wordElements).then((result) => [result, false]),
    waitForIndividualWPMData(wordElements).then((result) => [false, result]),
  ]);

  const hasWPMData = observerResult || pollingResult;
  console.log(
    "MonkeyType Logger: WPM data detection completed - observer:",
    observerResult,
    "polling:",
    pollingResult
  );

  const wordsData = [];

  // Process words sequentially to avoid overwhelming the page with hover events
  for (let i = 0; i < wordElements.length; i++) {
    const wordElem = wordElements[i];

    // Improved word extraction
    let wordInput = "";
    let correctWord = "";

    // Try to get word from data attributes first
    wordInput =
      wordElem.getAttribute("data-word") ||
      wordElem.getAttribute("input") ||
      wordElem.getAttribute("text");

    // If no data attribute, try to extract from text content
    if (!wordInput) {
      // Get all text content from the element and its children
      const textContent = wordElem.textContent || wordElem.innerText || "";
      wordInput = textContent.trim();
    }

    // Get all letter inside words
    const letters = wordElem.querySelectorAll(
      "letter, .letter, [class*='letter'], span, div"
    );

    if (letters.length > 0) {
      correctWord = Array.from(letters)
        .map((el) => el.textContent || el.innerText || "")
        .join("")
        .trim();

      if (!wordInput) {
        wordInput = correctWord;
      }
    }

    if (!wordInput) {
      console.log("MonkeyType Logger: Could not extract word from element", i);
      continue;
    }

    let reason = "";

    // Improved error detection - check multiple possible class names and attributes
    const hasErrorClass =
      wordElem.classList.contains("error") ||
      wordElem.classList.contains("incorrect") ||
      wordElem.classList.contains("wrong") ||
      wordElem.classList.contains("mistake");

    const hasCorrectedClass =
      wordElem.querySelector(".corrected") ||
      wordElem.querySelector(".incorrect") ||
      wordElem.querySelector(".wrong") ||
      wordElem.querySelector(".mistake");

    const hasErrorAttribute =
      wordElem.getAttribute("data-error") === "true" ||
      wordElem.getAttribute("data-incorrect") === "true";

    // Check if any child elements have error classes
    const hasErrorChild = wordElem.querySelector(
      ".error, .incorrect, .wrong, .mistake"
    );

    if (hasErrorClass || hasErrorAttribute || hasErrorChild) {
      reason = "error";
    } else if (hasCorrectedClass) {
      reason = "corrected";
    } else {
      reason = "correct"; // Log all words, not just errors
    }

    // Skip overly long words (likely not real words)
    if (wordInput.length >= 20) {
      console.log("MonkeyType Logger: Skipping long word:", wordInput);
      continue;
    }

    // Try to extract individual WPM data
    let wordWPM = overallWPM; // Default to overall WPM

    // First try direct extraction
    const directWPM = extractIndividualWPM(wordElem);
    if (directWPM) {
      wordWPM = directWPM;
    } else {
      // Try hover-based extraction
      try {
        wordWPM = await getWPMFromHover(wordElem);
        if (!wordWPM) {
          wordWPM = overallWPM; // Fallback to overall WPM
        }
      } catch (error) {
        console.log(
          "MonkeyType Logger: Error extracting WPM from hover for word:",
          wordInput,
          error
        );
        wordWPM = overallWPM;
      }
    }

    console.log(
      "MonkeyType Logger: Found word:",
      wordInput,
      "reason:",
      reason,
      "WPM:",
      wordWPM
    );

    // Create word data object with WPM
    const wordData = {
      word: wordInput,
      wordCorrected: correctWord,
      reason,
      wpm: wordWPM,
    };

    wordsData.push(wordData);

    // Small delay between words to avoid overwhelming the page
    if (i < wordElements.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  if (wordsData.length === 0) {
    console.log("MonkeyType Logger: No words found to log");
    return;
  }

  console.log(
    "MonkeyType Logger: Logging",
    wordsData.length,
    "words with individual WPM data"
  );

  // Create a record with an id (using timestamp) and the current date/time.
  const record = {
    id: Date.now(),
    time: new Date().toISOString(),
    words: wordsData,
    overallWPM: overallWPM,
  };

  // Send the record to the background script for storage
  chrome.runtime.sendMessage({ action: "saveRecord", record }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "MonkeyType Logger: Error sending message:",
        chrome.runtime.lastError
      );
    } else {
      console.log("MonkeyType Logger: Record sent successfully");
    }
  });
}

// Function to observe for WPM data loading
function observeForWPMData(wordElements) {
  return new Promise((resolve) => {
    // Create a mutation observer to watch for WPM data being added
    const observer = new MutationObserver((mutations) => {
      let wpmDataFound = false;

      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const target = mutation.target;
          // Check if the mutation added WPM-related attributes
          if (
            mutation.attributeName === "burst" ||
            mutation.attributeName === "data-wpm" ||
            mutation.attributeName === "title" ||
            mutation.attributeName === "data-individual-wpm"
          ) {
            const wpm = extractIndividualWPM(target);
            if (wpm) {
              wpmDataFound = true;
              console.log(
                "MonkeyType Logger: WPM data found via mutation observer on",
                mutation.attributeName,
                "attribute"
              );
              break;
            }
          }
        } else if (mutation.type === "childList") {
          // Check if new elements with WPM data were added
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const wpm = extractIndividualWPM(node);
              if (wpm) {
                wpmDataFound = true;
                break;
              }
            }
          }
        }
      }

      if (wpmDataFound) {
        console.log(
          "MonkeyType Logger: WPM data detected via mutation observer"
        );
        observer.disconnect();
        resolve(true);
      }
    });

    // Observe all word elements for changes
    for (const wordElem of wordElements) {
      observer.observe(wordElem, {
        attributes: true,
        attributeFilter: ["burst", "data-wpm", "title", "data-individual-wpm"],
        childList: true,
        subtree: true,
      });
    }

    // Also observe the parent container for any WPM-related changes
    if (wordElements.length > 0) {
      const parentContainer = wordElements[0].parentElement;
      if (parentContainer) {
        observer.observe(parentContainer, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      }
    }

    // Set a timeout to stop observing if no data is found
    setTimeout(() => {
      observer.disconnect();
      resolve(false);
    }, 3000);
  });
}

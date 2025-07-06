document.getElementById("downloadButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadRecords" });
});

document.getElementById("debugButton").addEventListener("click", () => {
  // Send a message to the content script to manually trigger processing
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes("monkeytype.com")) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "debugTrigger" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Debug trigger error:", chrome.runtime.lastError);
            alert("Debug trigger failed. Check console for details.");
          } else {
            console.log("Debug trigger sent successfully");
            alert("Debug trigger sent. Check console for results.");
          }
        }
      );
    } else {
      alert("Please navigate to monkeytype.com first.");
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["records"], (result) => {
    const records = result.records || [];
    if (records.length > 0) {
      const lastRecord = records[records.length - 1];
      document.getElementById("errorCapacity").textContent =
        records.length + " records";

      // Display words with their WPM information
      const wordsDisplay = lastRecord.words
        .map((el) => {
          const wpmText = el.wpm ? ` (${el.wpm} WPM)` : "";
          const reasonText =
            el.reason === "error"
              ? "[ERROR]"
              : el.reason === "corrected"
              ? "[CORRECTED]"
              : "[CORRECT]";
          return `${reasonText} ${el.word}${wpmText}`;
        })
        .join(", ");

      document.getElementById("lastRecordContainer").textContent = wordsDisplay;

      // Display overall WPM if available
      if (lastRecord.overallWPM) {
        const wpmDisplay = document.getElementById("overallWPM");
        if (wpmDisplay) {
          wpmDisplay.textContent = `Overall WPM: ${lastRecord.overallWPM}`;
        }
      }
    }
  });
  chrome.storage.local.get(["activeSwitch"], (res) => {
    document.getElementById("switch").checked = res.activeSwitch ?? true;
  });
});

document
  .getElementById("deleteLastRecordButton")
  .addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "deleteLastRecord" }, () => {
      chrome.storage.local.get(["records"], (res) => {
        const updatedRecords = res.records || [];
        if (updatedRecords.length === 0) {
          document.getElementById("lastRecordContainer").textContent = "";
          const wpmDisplay = document.getElementById("overallWPM");
          if (wpmDisplay) {
            wpmDisplay.textContent = "";
          }
        } else {
          const lastRecord = updatedRecords[updatedRecords.length - 1];
          const wordsDisplay = lastRecord.words
            .map((el) => {
              const wpmText = el.wpm ? ` (${el.wpm} WPM)` : "";
              const reasonText =
                el.reason === "error"
                  ? "[ERROR]"
                  : el.reason === "corrected"
                  ? "[CORRECTED]"
                  : "[CORRECT]";
              return `${reasonText} ${el.word}${wpmText}`;
            })
            .join(", ");

          document.getElementById("lastRecordContainer").textContent =
            wordsDisplay;

          if (lastRecord.overallWPM) {
            const wpmDisplay = document.getElementById("overallWPM");
            if (wpmDisplay) {
              wpmDisplay.textContent = `Overall WPM: ${lastRecord.overallWPM}`;
            }
          }
        }
        document.getElementById("errorCapacity").textContent =
          updatedRecords.length + " records";
      });
    });
  });

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "application/json";

document.getElementById("importButton").addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        chrome.storage.local.get(["records"], (res) => {
          const merged = [...(res.records || []), ...importedData];
          chrome.storage.local.set({ records: merged });
          if (merged.length === 0) {
            document.getElementById("lastRecordContainer").textContent = "";
            const wpmDisplay = document.getElementById("overallWPM");
            if (wpmDisplay) {
              wpmDisplay.textContent = "";
            }
          } else {
            const lastRecord = merged[merged.length - 1];
            const wordsDisplay = lastRecord.words
              .map((el) => {
                const wpmText = el.wpm ? ` (${el.wpm} WPM)` : "";
                const reasonText =
                  el.reason === "error"
                    ? "[ERROR]"
                    : el.reason === "corrected"
                    ? "[CORRECTED]"
                    : "[CORRECT]";
                return `${reasonText} ${el.word}${wpmText}`;
              })
              .join(", ");

            document.getElementById("lastRecordContainer").textContent =
              wordsDisplay;

            if (lastRecord.overallWPM) {
              const wpmDisplay = document.getElementById("overallWPM");
              if (wpmDisplay) {
                wpmDisplay.textContent = `Overall WPM: ${lastRecord.overallWPM}`;
              }
            }
          }
          document.getElementById("errorCapacity").textContent =
            merged.length + " records";
        });
      } catch (error) {
        console.error("Failed to import JSON:", error);
      }
    };
    reader.readAsText(fileInput.files[0]);
  }
});

document.getElementById("resetButton").addEventListener("click", () => {
  if (confirm("Are you sure you want to clear all records?")) {
    chrome.runtime.sendMessage({ action: "resetAllRecords" });
    document.getElementById("lastRecordContainer").textContent = "";
    const wpmDisplay = document.getElementById("overallWPM");
    if (wpmDisplay) {
      wpmDisplay.textContent = "";
    }
    document.getElementById("errorCapacity").textContent = "0 records";
  }
});

document.getElementById("switch").addEventListener("change", (e) => {
  chrome.storage.local.set({ activeSwitch: e.target.checked });
});

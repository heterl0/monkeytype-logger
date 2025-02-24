document.getElementById("downloadButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadRecords" });
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["records"], (result) => {
    const records = result.records || [];
    if (records.length > 0) {
      document.getElementById("lastRecordContainer").textContent = records[
        records.length - 1
      ].words
        .map((el) => el.word)
        .join(", ");
    }
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
        } else {
          document.getElementById("lastRecordContainer").textContent =
            updatedRecords[updatedRecords.length - 1].words
              .map((w) => w.word)
              .join(", ");
        }
      });
    });
  });

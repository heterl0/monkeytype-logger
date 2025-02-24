document.getElementById("downloadButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadRecords" });
  window.close();
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["records"], (result) => {
    const records = result.records || [];
    if (records.length > 0) {
      document.getElementById("lastRecordContainer").textContent =
        JSON.stringify(records[records.length - 1]);
    }
  });
});

document
  .getElementById("deleteLastRecordButton")
  .addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "deleteLastRecord" });
  });

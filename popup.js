document.getElementById("downloadButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadRecords" });
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["records"], (result) => {
    const records = result.records || [];
    if (records.length > 0) {
      document.getElementById("errorCapacity").textContent =
        records.length + " records";
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
        document.getElementById("errorCapacity").textContent =
          records.length + " records";
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
          } else {
            document.getElementById("lastRecordContainer").textContent = merged[
              merged.length - 1
            ].words
              .map((w) => w.word)
              .join(", ");
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

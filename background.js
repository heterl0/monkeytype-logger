// background.js

// In-memory storage for records (alternatively, use chrome.storage.local)
let records = [];
let fileCounter = 1; // file naming counter

// Load existing records when background script starts
chrome.storage.local.get(["records", "fileCounter"], (result) => {
  records = result.records || [];
  fileCounter = result.fileCounter || 1;
});

// Function to check if a record already exists in the stored records
function isDuplicate(newRecord, recordArray) {
  // Changed to compare words data instead of just ID
  return recordArray.some((record) => {
    return JSON.stringify(record.words) === JSON.stringify(newRecord.words);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveRecord" && message.record) {
    if (!isDuplicate(message.record, records)) {
      records.push(message.record);

      // Save to chrome.storage.local
      chrome.storage.local.set({ records: records });

      // Trigger a toast message to the user that the record has been stored
      chrome.runtime.sendMessage({
        action: "showToast",
        message: "Record stored successfully!",
      });

      // Check if the record count exceeds the limit
      if (records.length >= 10000) {
        saveRecordsToFile(records, fileCounter);
        fileCounter++;
        chrome.storage.local.set({ fileCounter: fileCounter });
        records = [];
        chrome.storage.local.set({ records: records });
      }
    } else {
      console.log("Duplicate record detected. Skipping save.");
    }
  } else if (message.action === "downloadRecords") {
    saveRecordsToFile(records, fileCounter);
  }
});

// Function to create a JSON file download
function saveRecordsToFile(data, counter) {
  const filename =
    counter === 1 ? "monkeytype_data.json" : `monkeytype_data_${counter}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const reader = new FileReader();
  reader.onload = function () {
    chrome.downloads.download({
      url: reader.result,
      filename,
      conflictAction: "overwrite",
    });
  };
  reader.readAsDataURL(blob);
}

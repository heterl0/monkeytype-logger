// background.js

let activeSwitchState = true;

chrome.storage.local.get(["activeSwitch"], (res) => {
  activeSwitchState = res.activeSwitch ?? true;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.activeSwitch) {
    activeSwitchState = changes.activeSwitch.newValue ?? true;
  }
});

function isDuplicate(newRecord, recordArray) {
  if (recordArray.length === 0) return false;
  lastRecord = recordArray[recordArray.length - 1];
  if (newRecord.words.length !== lastRecord.words.length) return false;

  return newRecord.words.every((obj1) =>
    lastRecord.words.some(
      (obj2) =>
        Object.keys(obj1).length === Object.keys(obj2).length &&
        Object.keys(obj1).every((key) => obj1[key] === obj2[key])
    )
  );
}

function isActivated() {
  return activeSwitchState;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  chrome.storage.local.get(["records"], (result) => {
    records = result.records || [];
    if (message.action === "saveRecord" && message.record) {
      if (!isDuplicate(message.record, records) && isActivated()) {
        records.push(message.record);
        // Save to chrome.storage.local
        chrome.storage.local.set({ records: records });

        // Check if the record count exceeds the limit
        if (records.length >= 10000) {
          saveRecordsToFile(records);
          records = [];
          chrome.storage.local.set({ records: records });
        }
      } else {
        console.log("Duplicate record detected. Skipping save.");
      }
    } else if (message.action === "downloadRecords") {
      saveRecordsToFile(records);
    } else if (message.action === "deleteLastRecord") {
      if (records.length > 0) {
        records.pop();
        chrome.storage.local.set({ records });
      }
    } else if (message.action === "resetAllRecords") {
      records = [];
      chrome.storage.local.set({ records });
    }
  });
});

// Function to create a JSON file download
function saveRecordsToFile(data) {
  const filename = "monkeytype_data.json";
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

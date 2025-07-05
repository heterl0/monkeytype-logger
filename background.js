// background.js

let activeSwitchState = true;

// Add debugging
console.log("MonkeyType Logger: Background script loaded");

chrome.storage.local.get(["activeSwitch"], (res) => {
  activeSwitchState = res.activeSwitch ?? true;
  console.log("MonkeyType Logger: Active switch state:", activeSwitchState);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.activeSwitch) {
    activeSwitchState = changes.activeSwitch.newValue ?? true;
    console.log("MonkeyType Logger: Active switch updated to:", activeSwitchState);
  }
});

function isDuplicate(newRecord, recordArray) {
  if (recordArray.length === 0) return false;
  const lastRecord = recordArray[recordArray.length - 1];
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
  console.log("MonkeyType Logger: Received message:", message.action);
  
  chrome.storage.local.get(["records"], (result) => {
    const records = result.records || [];
    
    if (message.action === "saveRecord" && message.record) {
      console.log("MonkeyType Logger: Processing saveRecord with", message.record.words.length, "words");
      
      if (!isActivated()) {
        console.log("MonkeyType Logger: Logger is deactivated, skipping save");
        sendResponse({ success: false, reason: "deactivated" });
        return;
      }
      
      if (isDuplicate(message.record, records)) {
        console.log("MonkeyType Logger: Duplicate record detected, skipping save");
        sendResponse({ success: false, reason: "duplicate" });
        return;
      }
      
      try {
        records.push(message.record);
        // Save to chrome.storage.local
        chrome.storage.local.set({ records: records }, () => {
          if (chrome.runtime.lastError) {
            console.error("MonkeyType Logger: Error saving to storage:", chrome.runtime.lastError);
            sendResponse({ success: false, reason: "storage_error" });
          } else {
            console.log("MonkeyType Logger: Successfully saved record, total records:", records.length);
            sendResponse({ success: true, recordCount: records.length });
            
            // Check if the record count exceeds the limit
            if (records.length >= 10000) {
              console.log("MonkeyType Logger: Record limit reached, saving to file");
              saveRecordsToFile(records);
              records = [];
              chrome.storage.local.set({ records: records });
            }
          }
        });
      } catch (error) {
        console.error("MonkeyType Logger: Error processing record:", error);
        sendResponse({ success: false, reason: "processing_error" });
      }
    } else if (message.action === "downloadRecords") {
      console.log("MonkeyType Logger: Downloading records");
      saveRecordsToFile(records);
      sendResponse({ success: true });
    } else if (message.action === "deleteLastRecord") {
      console.log("MonkeyType Logger: Deleting last record");
      if (records.length > 0) {
        records.pop();
        chrome.storage.local.set({ records }, () => {
          console.log("MonkeyType Logger: Last record deleted, remaining:", records.length);
          sendResponse({ success: true, recordCount: records.length });
        });
      } else {
        sendResponse({ success: false, reason: "no_records" });
      }
    } else if (message.action === "resetAllRecords") {
      console.log("MonkeyType Logger: Resetting all records");
      records = [];
      chrome.storage.local.set({ records }, () => {
        console.log("MonkeyType Logger: All records reset");
        sendResponse({ success: true });
      });
    } else {
      console.log("MonkeyType Logger: Unknown action:", message.action);
      sendResponse({ success: false, reason: "unknown_action" });
    }
  });
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Function to create a JSON file download
function saveRecordsToFile(data) {
  console.log("MonkeyType Logger: Saving", data.length, "records to file");
  
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
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("MonkeyType Logger: Download error:", chrome.runtime.lastError);
      } else {
        console.log("MonkeyType Logger: File download started, ID:", downloadId);
      }
    });
  };
  reader.onerror = function() {
    console.error("MonkeyType Logger: FileReader error:", reader.error);
  };
  reader.readAsDataURL(blob);
}

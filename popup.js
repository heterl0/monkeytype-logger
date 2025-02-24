document.getElementById("downloadButton").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "downloadRecords" });
});

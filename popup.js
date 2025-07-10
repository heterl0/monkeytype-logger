// Utility functions to eliminate duplicate code
function formatWordDisplay(wordData) {
  return wordData
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
}

function updateOverallWPM(overallWPM) {
  if (overallWPM) {
    const wpmDisplay = document.getElementById("overallWPM");
    if (wpmDisplay) {
      wpmDisplay.textContent = `${overallWPM}`;
    }
  }
}

function clearDisplay() {
  document.getElementById("lastRecordContainer").textContent = "";
  const wpmDisplay = document.getElementById("overallWPM");
  if (wpmDisplay) {
    wpmDisplay.textContent = "--";
  }
}

function updateRecordCount(count) {
  document.getElementById("errorCapacity").textContent = count;
}

function updateDisplayWithRecord(record) {
  if (record && record.words) {
    const wordsDisplay = formatWordDisplay(record.words);
    document.getElementById("lastRecordContainer").textContent = wordsDisplay;
    updateOverallWPM(record.overallWPM);
  } else {
    clearDisplay();
  }
}

// Enhanced popup functionality class
class MonkeytypeLoggerPopup {
  constructor() {
    this.isLoading = false;
    this.settings = {
      autoSync: true,
      showNotifications: true,
    };

    this.init();
  }

  init() {
    this.loadSettings();
    this.bindEvents();
    this.loadData();
    this.updateStats();
  }

  bindEvents() {
    // Settings panel toggle
    document.getElementById("settingsButton").addEventListener("click", () => {
      this.toggleSettings();
    });

    document
      .getElementById("closeSettingsButton")
      .addEventListener("click", () => {
        this.toggleSettings();
      });

    // View all button
    document.getElementById("viewAllButton").addEventListener("click", () => {
      this.viewAllRecords();
    });

    // Bind existing event listeners
    this.bindExistingEvents();
  }

  bindExistingEvents() {
    // Original download button logic
    document.getElementById("downloadButton").addEventListener("click", () => {
      window.chrome.runtime.sendMessage({ action: "downloadRecords" });
      this.showToast("Records exported successfully", "success");
    });

    // Original debug button logic
    document.getElementById("debugButton").addEventListener("click", () => {
      window.chrome.tabs.query(
        { active: true, currentWindow: true },
        (tabs) => {
          if (
            tabs[0] &&
            tabs[0].url &&
            tabs[0].url.includes("monkeytype.com")
          ) {
            window.chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "debugTrigger" },
              (response) => {
                if (window.chrome.runtime.lastError) {
                  console.error(
                    "Debug trigger error:",
                    window.chrome.runtime.lastError
                  );
                  this.showToast("Debug trigger failed", "error");
                } else {
                  console.log("Debug trigger sent successfully");
                  this.showToast("Debug trigger sent", "success");
                }
              }
            );
          } else {
            this.showToast("Please navigate to monkeytype.com first", "error");
          }
        }
      );
    });

    // Original delete last record logic
    document
      .getElementById("deleteLastRecordButton")
      .addEventListener("click", () => {
        if (!confirm("Are you sure you want to delete the last record?")) {
          return;
        }

        this.showLoading(true);
        window.chrome.runtime.sendMessage(
          { action: "deleteLastRecord" },
          () => {
            window.chrome.storage.local.get(["records"], (res) => {
              const updatedRecords = res.records || [];
              if (updatedRecords.length === 0) {
                clearDisplay();
              } else {
                const lastRecord = updatedRecords[updatedRecords.length - 1];
                updateDisplayWithRecord(lastRecord);
              }
              updateRecordCount(updatedRecords.length);
              this.updateActivityList(updatedRecords);
              this.updateStats();
              this.showToast("Last record deleted", "success");
              this.showLoading(false);
            });
          }
        );
      });

    // Original import button logic
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";

    document.getElementById("importButton").addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        this.showLoading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            window.chrome.storage.local.get(["records"], (res) => {
              const merged = [...(res.records || []), ...importedData];
              window.chrome.storage.local.set({ records: merged }, () => {
                if (merged.length === 0) {
                  clearDisplay();
                } else {
                  const lastRecord = merged[merged.length - 1];
                  updateDisplayWithRecord(lastRecord);
                }
                updateRecordCount(merged.length);
                this.updateActivityList(merged);
                this.updateStats();
                this.showToast("Data imported successfully", "success");
                this.showLoading(false);
              });
            });
          } catch (error) {
            console.error("Failed to import JSON:", error);
            this.showToast("Invalid file format", "error");
            this.showLoading(false);
          }
        };
        reader.readAsText(fileInput.files[0]);
      }
    });

    // Original reset button logic
    document.getElementById("resetButton").addEventListener("click", () => {
      if (
        !confirm(
          "Are you sure you want to clear all records? This action cannot be undone."
        )
      ) {
        return;
      }

      this.showLoading(true);
      window.chrome.runtime.sendMessage({ action: "resetAllRecords" }, () => {
        clearDisplay();
        updateRecordCount(0);
        this.updateActivityList([]);
        this.updateStats();
        this.showToast("All data reset successfully", "success");
        this.showLoading(false);
      });
    });

    // Original switch logic
    document.getElementById("switch").addEventListener("change", (e) => {
      window.chrome.storage.local.set({ activeSwitch: e.target.checked });
      this.showToast(
        e.target.checked ? "Logger activated" : "Logger deactivated",
        "success"
      );
    });
  }

  toggleSettings() {
    const panel = document.getElementById("settingsPanel");
    panel.classList.toggle("active");
  }

  showLoading(show = true) {
    const overlay = document.getElementById("loadingOverlay");
    if (show) {
      overlay.classList.add("active");
    } else {
      overlay.classList.remove("active");
    }
    this.isLoading = show;
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  async loadData() {
    try {
      window.chrome.storage.local.get(["records", "activeSwitch"], (result) => {
        const records = result.records || [];

        // Update original display logic (this handles the lastRecordContainer)
        if (records.length > 0) {
          const lastRecord = records[records.length - 1];
          updateRecordCount(records.length);
          updateDisplayWithRecord(lastRecord);
        } else {
          clearDisplay();
          updateRecordCount(0);
        }

        // Update new activity display (this will show/hide the container)
        this.updateActivityList(records);

        // Update activation state
        document.getElementById("switch").checked = result.activeSwitch ?? true;
      });
    } catch (error) {
      this.showToast("Failed to load data", "error");
    }
  }

  updateActivityList(records) {
    const container = document.getElementById("activityContainer");
    const emptyState = document.getElementById("emptyState");
    const lastRecordContainer = document.getElementById("lastRecordContainer");

    if (!records || records.length === 0) {
      emptyState.style.display = "flex";
      lastRecordContainer.style.display = "none";
      return;
    }

    emptyState.style.display = "none";
    lastRecordContainer.style.display = "block";

    // Get the most recent record and use the original formatting function
    const lastRecord = records[records.length - 1];
    updateDisplayWithRecord(lastRecord);
  }

  updateStats() {
    window.chrome.storage.local.get(["records"], (result) => {
      const records = result.records || [];

      // Update record count (already handled by updateRecordCount)

      // Calculate accuracy
      if (records.length > 0) {
        let totalWords = 0;
        let totalErrors = 0;

        records.forEach((record) => {
          if (record.words) {
            totalWords += record.words.length;
            totalErrors += record.words.filter(
              (w) => w.reason === "error"
            ).length;
          }
        });

        const accuracy =
          totalWords > 0
            ? Math.round(((totalWords - totalErrors) / totalWords) * 100)
            : 0;
        document.getElementById("accuracyRate").textContent = `${accuracy}%`;
      } else {
        document.getElementById("accuracyRate").textContent = "--";
      }
    });
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  viewAllRecords() {
    // Open a new tab with detailed analysis
    window.chrome.tabs.create({
      url: "https://monkeytype-analysis.heterl0.live/",
    });
  }

  loadSettings() {
    window.chrome.storage.local.get(["settings"], (result) => {
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }

      // Update settings UI
      document.getElementById("autoSync").checked = this.settings.autoSync;
      document.getElementById("showNotifications").checked =
        this.settings.showNotifications;
    });
  }
}

// Original DOMContentLoaded logic enhanced
document.addEventListener("DOMContentLoaded", () => {
  // Initialize original functionality
  window.chrome.storage.local.get(["records"], (result) => {
    const records = result.records || [];
    if (records.length > 0) {
      const lastRecord = records[records.length - 1];
      updateRecordCount(records.length);
      updateDisplayWithRecord(lastRecord);
    } else {
      clearDisplay();
      updateRecordCount(0);
    }
  });

  window.chrome.storage.local.get(["activeSwitch"], (res) => {
    document.getElementById("switch").checked = res.activeSwitch ?? true;
  });

  // Initialize enhanced popup functionality
  window.popupInstance = new MonkeytypeLoggerPopup();
});

// Listen for storage changes to update UI in real-time
window.chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes.records) {
      const records = changes.records.newValue || [];
      if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        updateRecordCount(records.length);
        updateDisplayWithRecord(lastRecord);
      } else {
        clearDisplay();
        updateRecordCount(0);
      }

      // Update activity list if popup instance exists
      if (window.popupInstance) {
        window.popupInstance.updateActivityList(records);
        window.popupInstance.updateStats();
      }
    }
  }
});

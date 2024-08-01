document.getElementById("activate").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tabId = tabs[0].id;
      chrome.runtime.sendMessage(
        { action: "fetchData", tabId: tabId },
        (response) => {
          const output = document.getElementById("output");
          if (chrome.runtime.lastError) {
            console.error(
              "Error handling response:",
              chrome.runtime.lastError.message
            );
            output.textContent = "Error: " + chrome.runtime.lastError.message;
          } else if (response && response.success) {
            console.log("Data fetched and message sent to content script");
            output.textContent =
              "Success: Data fetched and sent to content script.";
          } else {
            console.error(
              "Error:",
              response ? response.error : "No response received"
            );
            output.textContent =
              "Error: " + (response ? response.error : "No response received");
          }
        }
      );
    }
  });
});

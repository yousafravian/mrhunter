chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "fetchData") {
    try {
      const response = await fetch('http://localhost:3000/data');
      if (!response.ok) {
        throw new Error('Network response was not ok: ' + response.statusText);
      }
      const data = await response.json();
      if (data.length === 0) {
        throw new Error('No data received from the API');
      }

      const credentials = { action: 'login', email: data[0].email, password: data[0].password };
      chrome.tabs.sendMessage(message.tabId, credentials, (msgResponse) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message to content script:', chrome.runtime.lastError.message);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else if (msgResponse && msgResponse.success) {
          console.log('Message sent with email and password');
          sendResponse({ success: true });

          chrome.tabs.onUpdated.addListener(function onUpdated(tabId, changeInfo, tab) {
            if (tabId === message.tabId && changeInfo.status === 'complete' && tab.url.includes('facebook.com')) {
              console.log('login tab updated');
              chrome.tabs.sendMessage(tabId, { action: 'search', query: 'Wild Duck Fishing Room' });
              chrome.tabs.onUpdated.removeListener(onUpdated); // Remove listener to prevent repeated searches
            }
          });
        } else {
          const errorMsg = msgResponse ? msgResponse.error : 'No response from content script';
          console.error('Error:', errorMsg);
          sendResponse({ success: false, error: errorMsg });
        }
      });
    } catch (error) {
      console.error('Error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;  // Indicate that we will send a response asynchronously
  }
});

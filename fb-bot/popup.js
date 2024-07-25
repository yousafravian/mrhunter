document.getElementById('activate').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "login" }, (response) => {
      console.log("Fetched Data: ", response.data);
      document.getElementById("output").textContent = JSON.stringify(response.data, null, 2);
    });
  });
});



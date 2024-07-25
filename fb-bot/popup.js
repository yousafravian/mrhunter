document.getElementById('activate').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    try {
      const response = await fetch('http://localhost:3000/data');
      if (!response.ok) {
        throw new Error('Network response was not ok ' + response.statusText);
      }
      const data = await response.json();
      console.log(data);
    
      if (data.length > 0) {
        const credentials = { action: 'login', email: data[0]['email'], password: data[0]['password'] };
        console.log(credentials);
        chrome.tabs.sendMessage(tabs[0].id, credentials, () => {
          console.log('Message sent with email and password');
        });
      } else {
        console.error('No data received from the API');
      }
    } catch (error) {
      console.error('There has been a problem with your fetch operation:', error);
    }
  });
});

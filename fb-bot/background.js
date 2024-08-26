chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'startScraping' && request.link) {
    await startScraping(request.link);
  } else if (request.action === 'startBot' && request.credentialsToLogin) {
    const credentialsToLogin = request.credentialsToLogin;
    try {
      await loginToFacebook(credentialsToLogin);
    } catch (error) {
      console.error('Error during bot execution:', error);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'showFinalAlert',
          message:
            'The bot has halted due to an error'
        });
      });
    }
  }
});

async function loginToFacebook(credentials) {
  await delayRandom();
  await navigateToFacebook();
  await delayRandom(); // Simulate delay for human-like interaction

  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0].id;
      try {
        await sendAlertMessage(tabId, {
          action: 'showRunningAlert',
          message: 'Bot active and running...'
        });

        chrome.tabs.sendMessage(
          tabId,
          { action: 'login', credentials: credentials },
          (response) => {
            if (response?.status !== 'action_completed') {
              console.error('Login failed');
              reject(new Error('Login failed'));
              return; // Stop further execution
            }

            // Add an onUpdated listener for the tab
            chrome.tabs.onUpdated.addListener(function listener(
              updatedTabId,
              changeInfo
            ) {
              if (updatedTabId === tabId && changeInfo.status === 'complete') {
                console.log('Tab has finished updating after login');
                // Remove the listener to avoid future unnecessary triggers
                chrome.tabs.onUpdated.removeListener(listener);
                sendAlertMessage(tabId, {
                  action: 'showRunningAlert',
                  message:
                    'Login successful. Please select a page from the popup to start scraping'
                });
                // Resolve the promise
                resolve();
              }
            });
          }
        );
      } catch (error) {
        console.error('Error loggin in to facebook', error);
        reject(error);
      }
    });
  });
}

async function navigateToFacebook() {
  // Simulate navigation action to Facebook
  // Add logic to open Facebook if not already on the page
  chrome.tabs.create(
    { url: 'https://facebook.com', active: true },
    function (tab) {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
          chrome.tabs.onUpdated.removeListener(listener);
          return Promise.resolve(); // Placeholder resolve
        }
      });
    }
  );
}

async function delayRandom() {
  const delayTime = Math.random() * (5000 - 2000) + 2000; // 2 to 5 seconds delay
  return new Promise((resolve) => setTimeout(resolve, delayTime));
}

function sendAlertMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

async function startScraping(pageLink) {
  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: pageLink, active: true }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (info.status === 'complete' && tabId === tab.id) {
          sendAlertMessage(tabId, {
            action: 'showRunningAlert',
            message: 'Bot active and running...Initiate profile scraping'
          });
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(
            tabId,
            {
              action: 'startScraping'
            },
            (response) => {
              if (response?.status !== 'action_completed') {
                console.error('Scraping failed');
                reject(new Error('Scraping failed'));
              } else if (response.status === 'action_completed') {
                setTimeout(() => {
                  chrome.tabs.remove(tabId, resolve); // Close the tab and resolve the promise
                }, 7000); // Adjust this delay if necessary
              }
            }
          );
        }
      });
    });
  });
}

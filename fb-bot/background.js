chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
 if (request.action === 'startBot' && request.credentialsToLogin) {
  const credentialsToLogin = request.credentialsToLogin;
  try {
   await handleBotOperations(credentialsToLogin);
  } catch (error) {
   console.error('Error during bot execution:', error);
   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {
     action: 'showFinalAlert',
     message: 'The bot has halted due to an error'
    });
   });
  }
 }
});

async function handleBotOperations(credentialsToLogin) {
 await loginToFacebook(credentialsToLogin);
 await delayRandom();
 const pages = await getPageLinks();
 const limit = Math.min(pages.length, credentialsToLogin.scrapeLimit);
 const shuffledArr = await shuffleArray([...pages]);
 const credential = await getCredentialByEmail(credentialsToLogin.email);
 if (credential && credential.pagesScraped < credential.scrapeLimit) {
  if (pages.length) {
   for (let i = 0; i < limit; i++) {
    await startScraping(shuffledArr[i].link, credentialsToLogin);
    await delayRandom(2000, 5000);
   }
  }
 }
 await notifyCompletion(credentialsToLogin.email);
}

async function notifyCompletion(email) {
 const currentTabId = await getCurrentTabId();
 await reloadTabAndWait(currentTabId);
 try {
  await sendAlertMessage(currentTabId, {
   action: 'showRunningAlert',
   message: `Bot has completed its operations on the profile with email: ${email}. Logging out`
  });
  await delayRandom();
  return new Promise((resolve, reject) => {
   chrome.tabs.sendMessage(
    currentTabId,
    { action: 'logout' },
    async (response) => {
     if (response?.status !== 'action_completed')
      return reject(new Error('Logout failed'));
     await waitForTabUpdate(currentTabId);
     await delayRandom();

     const credentialsToLogin = await fetchData(
      `http://localhost:3000/credentials/getValidationAndScrapingCredentials`
     );
     if (!Object.entries(credentialsToLogin).length === 0) {
      await handleBotOperations(credentialsToLogin);
     }

     await sendAlertMessage(currentTabId, {
      action: 'showRunningAlert',
      message: `Bot has completed its operations on the available facebook credentials. Reset to start again`
     });

     resolve();
    }
   );
  });
 } catch (error) {
  console.error('Failed to send alert message:', error);
 }
}

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
         message: 'Login successful. Starting page extraction.'
        });
        markDocumentInUse(credentials.email);

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

async function delayRandom(min = 1000, max = 3000) {
 const delayTime = Math.random() * (max - min) + min;
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

async function startScraping(pageLink, credentials) {
 return new Promise((resolve, reject) => {
  chrome.tabs.create({ url: pageLink, active: true }, (tab) => {
   chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (info.status === 'complete' && tabId === tab.id) {
     sendAlertMessage(tabId, {
      action: 'showRunningAlert',
      message: 'Bot active and running...Initiate profile scraping'
     });
     chrome.tabs.onUpdated.removeListener(listener);
     flagPageScraped(pageLink);
     chrome.tabs.sendMessage(
      tabId,
      {
       action: 'startScraping',
       pageLink: pageLink,
       credentials: credentials
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

async function getPageLinks() {
 try {
  const response = await fetch('http://localhost:3000/pages/');

  // Check if the response is successful
  if (!response.ok) {
   throw new Error(`Error fetching data: ${response.statusText}`);
  }

  // Parse the JSON response
  const pageLinks = await response.json();
  return pageLinks;
 } catch (error) {
  console.error(`Failed to retrieve page links: ${error.message}`);
  return null;
 }
}

async function getCurrentTabId() {
 const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
 return tabs[0].id;
}

async function markDocumentInUse(email) {
 const tabId = await getCurrentTabId();
 try {
  // await sendAlertMessage(tabId, {
  //  action: 'showRunningAlert',
  //  message: 'Marking the profile in_use to true'
  // });
  const response = await fetch('http://localhost:3000/credentials/markInUse', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json'
   },
   body: JSON.stringify({ email }) // Pass the email in the request body
  });

  if (!response.ok) {
   const errorMessage = await response.json();
   console.error(`Failed to mark document as in use: ${errorMessage.message}`);
   return;
  }

  const result = await response.json();
  console.log(result.message); // Log the success message
 } catch (error) {
  console.error('Error calling the markInUse endpoint:', error);
 }
}

async function flagPageScraped(link) {
 try {
  const response = await fetch('http://localhost:3000/pages/addScrapedPage', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify({ link })
  });

  if (!response.ok) throw new Error('Failed to send hunter to server');
  console.log('Hunter successfully sent to server');
 } catch (error) {
  console.error('Error sending data to server:', error);
 }
}

async function fetchData(url) {
 const response = await fetch(url);
 if (!response.ok) {
  throw new Error(`Failed to fetch data from ${url}`);
 }
 return response.json();
}

async function reloadTabAndWait(tabId) {
 return new Promise((resolve) => {
  // Listen for the tab's update events
  const handleTabUpdate = (updatedTabId, changeInfo) => {
   if (updatedTabId === tabId && changeInfo.status === 'complete') {
    // Tab has finished reloading
    chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    resolve(); // Resolve the promise once reload is complete
   }
  };

  // Add the event listener
  chrome.tabs.onUpdated.addListener(handleTabUpdate);

  // Trigger the tab reload with cache bypass to perform a hard reload
  chrome.tabs.reload(tabId, { bypassCache: true });
 });
}

function shuffleArray(array) {
 for (let i = array.length - 1; i > 0; i--) {
  // Generate a random index between 0 and i
  const j = Math.floor(Math.random() * (i + 1));
  // Swap elements at indices i and j
  [array[i], array[j]] = [array[j], array[i]];
 }
 return array;
}

async function getCredentialByEmail(email) {
 try {
  const response = await fetch(
   `http://localhost:3000/credentials/getSVCredentialByEmail/${email}`,
   {
    method: 'GET',
    headers: {
     'Content-Type': 'application/json'
    }
   }
  );

  if (response.ok) {
   const userData = await response.json();
   console.log('User data retrieved:', userData);
   return userData;
  } else {
   console.error('Failed to retrieve user. Status:', response.status);
   return null;
  }
 } catch (error) {
  console.error('Error fetching user by email:', error);
  return null;
 }
}

async function waitForTabUpdate(tabId) {
 return new Promise((resolve) => {
  chrome.tabs.onUpdated.addListener(function listener(
   updatedTabId,
   changeInfo
  ) {
   if (updatedTabId === tabId && changeInfo.status === 'complete') {
    chrome.tabs.onUpdated.removeListener(listener);
    resolve();
   }
  });
 });
}

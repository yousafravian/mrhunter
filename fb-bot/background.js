let profiles = [];
let pages = [];

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'fetchData') {
    try {
      const [credentialsResponse, pagesResponse, scrapedUsersCountResponse] =
        await Promise.all([
          fetch('http://localhost:3000/credentials'),
          fetch('http://localhost:3000/pages'),
          fetch('http://localhost:3000/scraped_users/groupByPageDomain')
        ]);

      if (!credentialsResponse.ok) {
        throw new Error(
          'Network response was not ok: ' + credentialsResponse.statusText
        );
      }
      if (!pagesResponse.ok) {
        throw new Error(
          'Network response was not ok: ' + pagesResponse.statusText
        );
      }

      if (!scrapedUsersCountResponse.ok) {
        throw new Error(
          'Network response was not ok: ' + pagesResponse.statusText
        );
      }

      [profiles, pages, scrapedUsersCount] = await Promise.all([
        credentialsResponse.json(),
        pagesResponse.json(),
        scrapedUsersCountResponse.json()
      ]);

      if (profiles.length === 0) {
        throw new Error('No data received from the API');
      }
      if (pages.length === 0) {
        throw new Error('No data received from the API');
      }

      chrome.runtime.sendMessage({
        action: 'data',
        profiles: profiles,
        pages: pages,
        scrapedUsersCount: scrapedUsersCount
      });
      console.log(profiles);
      console.log(pages);
      console.log(scrapedUsersCount);
    } catch (error) {
      console.error('Error:', error);
    }
  } else if (message.action === 'startScraping' && message.link) {
    chrome.tabs.create({ url: message.link }, function (tab) {
      const tabId = tab.id;
    
      function onUpdatedListener(updatedTabId, changeInfo, updatedTab) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.sendMessage(tabId, { action: 'startScraping' });
          // Remove the listener after the message is sent
          chrome.tabs.onUpdated.removeListener(onUpdatedListener);
        }
      }
    
      chrome.tabs.onUpdated.addListener(onUpdatedListener);
    });
    
  } else if (message.action === 'login' && message.email) {
    const profile = profiles.find((profile) => profile.email === message.email);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'login',
        email: profile.email,
        password: profile.password
      });
    });
  }
});

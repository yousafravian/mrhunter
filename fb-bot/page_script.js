chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
 if (request.action === 'showRunningAlert' && request.message) {
  removeAllAlerts(); // Remove any existing alerts
  showTemporaryAlert(request.message, 0, true, '#008000'); // Show running alert, keep it on screen
  sendResponse({ status: 'action_completed' });
 }
 if (request.action === 'showFinalAlert' && request.message) {
  removeAllAlerts(); // Remove any existing alerts
  showTemporaryAlert(request.message, 0, true, '#ff0000'); // Show final alert, keep it on screen
 }
 if (
  request.action === 'startScraping' &&
  request.pageLink &&
  request.credentials
 ) {
  setTimeout(() => {
   initializeLinkTracking();
   showTemporaryAlert('Initiating data extraction', 0, true, '#008000');
   simulateHumanScroll(request.pageLink, request.credentials)
    .then(() => {
     sendResponse({ status: 'action_completed' });
    })
    .catch(() => {
     sendResponse({ status: 'action_failed' });
    });
  }, 5000);
 } else if (request.action === 'login' && request.credentials) {
  loginToFacebook(request.credentials)
   .then(() => {
    sendResponse({ status: 'action_completed' });
   })
   .catch(() => {
    sendResponse({ status: 'action_failed' });
   });
 } else if (request.action === 'logout') {
  logout()
   .then(() => {
    sendResponse({ status: 'action_completed' });
   })
   .catch(() => {
    sendResponse({ status: 'action_failed' });
   });
 }
 return true;
});

async function logout() {
 const clickElement = async (selector, isXPath = false) => {
  const element = await waitForElement(selector, isXPath);
  if (element) {
   element.click();
   await delayRandom();
   return true;
  }
  return false;
 };

 const findLogoutButton = async () => {
  const innerTexts = ['Log out', 'Log Out', 'log out'];
  try {
   const divs = document.querySelectorAll("div[role='button']");
   for (const text of innerTexts) {
    const logoutDiv = Array.from(divs).find(
     (div) => div.innerText.trim() === text
    );
    if (logoutDiv) {
     return logoutDiv;
    }
   }
  } catch (error) {
   console.log('Error finding element', error);
  }
  throw new Error('Error finding logout button');
 };
 try {
  const profileAvatarSelector = 'div[aria-label="Your profile"][role="button"]';
  if (!(await clickElement(profileAvatarSelector))) {
   console.log('profile not found');
   return Promise.reject(new Error('Profile avatar not found.'));
  }

  await delayRandom();

  const logoutDiv = await findLogoutButton();

  if (logoutDiv) {
   await delayRandom();
   logoutDiv.click();
  } else {
   console.log('logout button not found');
   return Promise.reject(new Error('Logout button not found'));
  }
 } catch (error) {
  return Promise.reject(error);
 }
}

function getRandomNumber(min, max) {
 return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to get an element by XPath
function getElementByXPath(xpath) {
 const result = document.evaluate(
  xpath,
  document,
  null,
  XPathResult.FIRST_ORDERED_NODE_TYPE,
  null
 );
 return result.singleNodeValue;
}

// Function to scroll by a specified amount
function scrollByAmount(amount) {
 return new Promise((resolve) => {
  const distance = 100; // distance to scroll on each step
  let scrolled = 0;

  const timer = setInterval(() => {
   window.scrollBy(0, distance);
   scrolled += distance;

   if (scrolled >= amount) {
    clearInterval(timer);
    console.log(`Scrolled by ${scrolled}px`);
    resolve();
   }
  }, 100); // delay between each scroll step
 });
}

function initializeLinkTracking() {
 window.allExtractedLinks = new Set(); // Stores all unique links extracted across multiple calls
 window.lastExtractedLinks = []; // Stores links from the last extraction
}

async function extractDesiredLinks() {
 return new Promise((resolve, reject) => {
  const divs = document.querySelectorAll('div[aria-label="profile_name"]');
  const currentExtractedSet = new Set();
  const newLinks = [];

  const profilePattern = /facebook\.com\/profile\.php/;
  const usernamePattern = /facebook\.com\/[a-zA-Z0-9.]+(?=\?|$)/;

  divs.forEach((div) => {
   const anchorTag = div.querySelector('a');
   let href = anchorTag.href;
   let sanitizedHref;

   if (profilePattern.test(href)) {
    const baseUrl = href.split('?')[0];
    const queryParams = new URLSearchParams(href.split('?')[1]);
    const id = queryParams.get('id');
    if (id) {
     sanitizedHref = `${baseUrl}?id=${id}`;
    }
   } else if (usernamePattern.test(href)) {
    sanitizedHref = href.split('?')[0];
   }

   if (sanitizedHref) {
    currentExtractedSet.add(sanitizedHref);
   }
  });

  currentExtractedSet.forEach((link) => {
   if (!window.allExtractedLinks.has(link)) {
    newLinks.push(link);
    window.allExtractedLinks.add(link);
   }
  });

  resolve(newLinks);
 });
}

async function simulateHumanScroll(
 pageLink,
 credentials,
 config = {
  minScroll: 1000,
  maxScroll: 3000,
  maxRetries: 3,
  delayBetweenScrolls: 1000,
  scrollTimeout: 2500
 }
) {
 return new Promise(async (resolve, reject) => {
  let lastPosition = -1;
  let retryCount = 0;
  const distance = await getRandomNumber(config.minScroll, config.maxScroll);

  const originDomain = window.location.origin;
  const xpathQuery = `//a[contains(@href, '${originDomain}') and contains(@href, 'reviews') and @role='tab']`;
  const reviewsTab = getElementByXPath(xpathQuery);

  if (reviewsTab) {
   reviewsTab.click();
   await delay(4000); // Wait for tab content to load
  }

  async function scrollAndExtract() {
   window.scrollBy({ top: distance, left: 0, behavior: 'smooth' });
   await new Promise((r) => setTimeout(r, config.scrollTimeout));

   try {
    const newLinks = await extractDesiredLinks();
    if (newLinks && newLinks.length > 0) {
     const timestamp = new Date().toISOString();
     await addLinksToServer(newLinks, pageLink, timestamp);
     console.log('Newly extracted links:', newLinks);
    }

    const currentPosition = window.scrollY;

    // Detect if the page has reached the bottom or is stuck
    if (
     window.innerHeight + window.scrollY >=
     document.body.offsetHeight - 50
    ) {
     // Ensure content has fully loaded after reaching the bottom
     showTemporaryAlert(
      'Reached near the bottom of the page. Waiting for content...',
      undefined,
      undefined,
      '#008000'
     );
     console.log(
      'Reached near bottom of the page. Waiting for potential new content...'
     );
     await delay(6000); // Wait for potential dynamic loading

     // Recheck after waiting
     if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 50
     ) {
      showTemporaryAlert(
       'Page bottom confirmed, extraction complete.',
       undefined,
       undefined,
       '#008000'
      );
      console.log('Reached confirmed bottom of the page.');
      await incrementPagesScraped(credentials.email);
      await delay(2000); // Additional delay before resolving
      return resolve();
     }
    }

    if (currentPosition === lastPosition) {
     if (retryCount < config.maxRetries) {
      showTemporaryAlert(
       'Scroll position stuck, retrying...',
       undefined,
       undefined,
       '#FFA500'
      );
      console.log('Scroll position stuck, retrying...');
      retryCount++;
      await delay(2000); // Wait before retrying
      scrollAndExtract(); // Retry scrolling
     } else {
      showTemporaryAlert(
       'Maximum retries reached. Ending extraction.',
       undefined,
       undefined,
       '#FF0000'
      );
      console.log('Maximum retries reached, ending extraction.');
      await incrementPagesScraped(credentials.email);
      await delay(2000);
      return resolve(); // Exit after retries are exhausted
     }
    } else {
     lastPosition = currentPosition;
     await delay(config.delayBetweenScrolls); // Wait before next scroll
     scrollAndExtract(); // Continue scrolling
    }
   } catch (error) {
    console.error('Error during scrolling or extraction:', error);
    reject(error); // Reject the promise on error
   }
  }

  // Start scrolling and extracting process
  scrollAndExtract();
 });
}

/**
 * Function to log into Facebook with provided credentials.
 * @param {Object} credentials - The login credentials.
 * @returns {Promise<void>}
 */
async function loginToFacebook(credentials) {
 try {
  //find the form
  const form = document.querySelector('form');
  if (form) {
   const loginButton = form.querySelector('button[type="submit"]');
   //fill the login form
   form.querySelector('input[name="email"]').value = credentials.email;
   form.querySelector('input[name="pass"]').value = credentials.password;
   if (loginButton) {
    await delayRandom();
    loginButton.click();
   } else {
    throw new Error('Login button not found');
   }
  } else {
   throw new Error('Login form not found');
  }

  // Placeholder: Add logic to verify login success
  return Promise.resolve(); // Placeholder resolve
 } catch (error) {
  console.error(error);
  return Promise.reject(error); // Placeholder reject
 }
}

async function sendProfileLinksToServer(
 profileLink,
 pageDomain,
 postContent,
 timestamp
) {
 try {
  const response = await fetch(
   'http://localhost:3000/scraped_users/addScrapedUser',
   {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({
     profileLink,
     pageDomain,
     postContent,
     timestamp
    })
   }
  );

  if (response.ok) {
   console.log('Profile link successfully sent to the server');
   showTemporaryAlert(
    'Profile link successfully sent to the server',
    undefined,
    undefined,
    '#008000'
   );
  } else {
   console.error('Failed to send profile link to the server');
  }
 } catch (error) {
  console.error('Error sending profile links to the server:', error);
 }
}

async function sendLastScrapedUserToServer(profileLink, pageDomain, timestamp) {
 try {
  const response = await fetch(
   'http://localhost:3000/scraped_users/lastScrapedUser',
   {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({ profileLink, pageDomain, timestamp })
   }
  );

  if (response.ok) {
   console.log('last scraped user updated');
  } else {
   console.error('Failed to send profile link to the server');
  }
 } catch (error) {
  console.error('Error sending profile links to the server:', error);
 }
}

async function delayRandom(min = 1000, max = 3000) {
 const delayTime = Math.random() * (max - min) + min;
 return new Promise((resolve) => setTimeout(resolve, delayTime));
}

async function getLastScrapedUserFromServer() {
 try {
  const response = await fetch(
   'http://localhost:3000/scraped_users/lastScrapedUser'
  );

  if (!response.ok) {
   throw new Error('Failed to fetch the last scraped user from the server');
  }

  const lastScrapedUsers = await response.json();
  console.log('Last scraped user fetched successfully');

  return lastScrapedUsers;
 } catch (error) {
  console.error('Error fetching the last scraped user from the server:', error);
  return null; // or any default value you prefer
 }
}

/**
 * Delays execution for a given time.
 * @param {number} ms - Time in milliseconds to delay.
 * @returns {Promise<void>}
 */
function delay(ms) {
 return new Promise((resolve) => setTimeout(resolve, ms));
}

// Modified showTemporaryAlert function to include a class for easier removal
function showTemporaryAlert(
 message,
 duration = 5000,
 keepOnScreen = false,
 color = '#f44336'
) {
 // Create a container div for the alert
 const alertDiv = document.createElement('div');
 alertDiv.classList.add('temporary-alert'); // Add class for identification

 // Get random positions for the alert
 const randomTop =
  Math.floor(Math.random() * (window.innerHeight - 100)) + 'px';
 const randomLeft =
  Math.floor(Math.random() * (window.innerWidth - 300)) + 'px';

 // Style the alert
 alertDiv.style.position = 'fixed';
 alertDiv.style.top = randomTop;
 alertDiv.style.left = randomLeft;
 alertDiv.style.zIndex = '9999';
 alertDiv.style.padding = '10px 20px';
 alertDiv.style.backgroundColor = color;
 alertDiv.style.color = '#ffffff'; // Text color set to white
 alertDiv.style.fontSize = '16px';
 alertDiv.style.borderRadius = '8px';
 alertDiv.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
 alertDiv.style.transition = 'opacity 0.5s, transform 0.5s';
 alertDiv.style.cursor = 'pointer';
 alertDiv.style.transform = 'translateY(0)';

 // Set the message
 alertDiv.innerText = message;

 // Append the alert to the body
 document.body.appendChild(alertDiv);

 // Add a click event to manually remove the alert if needed
 alertDiv.addEventListener('click', () => {
  alertDiv.style.opacity = '0';
  alertDiv.style.transform = 'translateY(-20px)';
  setTimeout(() => {
   document.body.removeChild(alertDiv);
  }, 500);
 });

 if (!keepOnScreen) {
  // Set a timeout to remove the alert after the specified duration
  setTimeout(() => {
   alertDiv.style.opacity = '0';
   alertDiv.style.transform = 'translateY(-20px)';
   setTimeout(() => {
    document.body.removeChild(alertDiv);
   }, 500);
  }, duration);
 }
}

// Function to remove all existing alerts
function removeAllAlerts() {
 const alerts = document.querySelectorAll('.temporary-alert');
 alerts.forEach((alert) => alert.remove());
}

// Function to send data to the server
async function sendDataToServer(scrapeCount, pageDomain, timestamp) {
 try {
  const response = await fetch('http://localhost:3000/mail/reportScrapeStats', {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json'
   },
   body: JSON.stringify({ scrapeCount, pageDomain, timestamp })
  });

  if (!response.ok) {
   throw new Error('Failed to send data to server');
  } else {
   console.log('script failure report successfully sent to server');
   showTemporaryAlert(
    'Scrape stats successfully sent to admin email',
    undefined,
    undefined,
    '#008000'
   );
  }
 } catch (error) {
  console.error('Error sending data to server:', error);
 }
}

async function addLinksToServer(links, pageDomain, timestamp) {
 // Define the API endpoint where the request will be sent
 const apiEndpoint = 'http://localhost:3000/scraped_users/addScrapedLinks';

 // Construct the request payload
 const payload = {
  links: links,
  pageDomain: pageDomain,
  timestamp: timestamp
 };

 try {
  // Make the POST request using fetch
  const response = await fetch(apiEndpoint, {
   method: 'POST',
   headers: {
    'Content-Type': 'application/json'
   },
   body: JSON.stringify(payload) // Convert the payload object into a JSON string
  });

  // Check if the response is successful
  if (response.ok) {
   const data = await response.json();
   console.log('Links successfully added:', data);
   showTemporaryAlert(
    `${links.length} links succesfully scraped and sent to server`,
    undefined,
    undefined,
    '#008000'
   );
   return data;
  } else {
   // If the request fails, log the status and message
   const errorData = await response.json();
   console.error(
    `Failed to add links. Status: ${response.status}, Message: ${errorData.message}`
   );
  }
 } catch (error) {
  console.error('Error occurred while adding links:', error);
 }
}

async function incrementPagesScraped(email) {
 fetch('http://localhost:3000/credentials/incrementPagesScraped', {
  method: 'POST',
  headers: {
   'Content-Type': 'application/json'
  },
  body: JSON.stringify({ email }) // Send the email in the request body
 })
  .then((response) => response.json())
  .then((data) => {
   console.log('Updated document:', data);
  })
  .catch((error) => {
   console.error('Error:', error);
  });
}

async function waitForElement(
 selectorOrXPath,
 isXPath = false,
 timeout = 7000,
 interval = 500
) {
 const startTime = Date.now();

 return new Promise((resolve) => {
  const checkElement = () => {
   let element;
   if (isXPath) {
    element = document.evaluate(
     selectorOrXPath,
     document,
     null,
     XPathResult.FIRST_ORDERED_NODE_TYPE,
     null
    ).singleNodeValue;
   } else {
    element = document.querySelector(selectorOrXPath);
   }

   if (element) {
    resolve(element);
   } else if (Date.now() - startTime > timeout) {
    resolve(null); // Resolve with null if element is not found within the timeout
   } else {
    setTimeout(checkElement, interval);
   }
  };

  checkElement();
 });
}

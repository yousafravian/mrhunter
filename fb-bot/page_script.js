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
  if (request.action === 'startScraping') {
    setTimeout(() => {
      extractProfileLinks()
        .then((profileLinks) => {
          console.log('All profile links:', profileLinks);
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
  }
  return true;
});

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

/**
 * Function to get all profile links with dynamic XPath, starting from a given num
 * @param {number} startNum - The starting number for profiles to fetch.
 * @param {Set<string>} foundProfiles - A Set to keep track of found profiles.
 * @returns {Promise<{profileLinks: string[], lastProcessedNum: number, halted: boolean}>} - A promise that resolves with the profile links, last processed number, and a flag indicating if scraping was halted.
 */
async function getAllProfileLinks(startNum, foundProfiles, pageDomain) {
  const profileLinks = [];
  let num = startNum;
  const lastScrapedUsersData = await getLastScrapedUserFromServer();
  const lastScrapedUser = lastScrapedUsersData.find(
    (user) => user.pageDomain === pageDomain
  );

  let halted = false;

  while (true) {
    try {
      const profileXpath = `/html/body/div[1]/div/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div/div[4]/div/div/div/div[${num}]/div/div/div/div/div/div/div/div/div/div[13]/div/div/div[2]/div/div[2]/div/div[1]/span/h2/span/strong[1]/span/a`;
      const postXpath = `/html/body/div[1]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div/div[4]/div/div/div/div[${num}]/div/div/div/div/div/div/div/div/div/div[13]/div/div/div[3]/div/div/span/div`;

      const profile = getElementByXPath(profileXpath);
      let formattedProfileLink;

      if (profile) {
        if (profile.href.includes('profile.php?id=')) {
          formattedProfileLink = profile.href.split('&')[0];
        } else {
          formattedProfileLink = profile.href.split('?')[0];
        }
        if (formattedProfileLink === lastScrapedUser?.profileLink) {
          console.log(`last scraped user found at: ${num}`);
          halted = true;
          break; // Stop scraping here
        }

        if (!foundProfiles.has(profile.href)) {
          const post = getElementByXPath(postXpath);
          const postContent = post ? post.textContent : '';

          profileLinks.push(profile.href);
          foundProfiles.add(profile.href);
          console.log(`Found profile link: ${profile.href} at num: ${num}`);
          const timestamp = Date.now();

          await sendProfileLinksToServer(
            profile.href,
            pageDomain,
            postContent,
            timestamp
          );

          if (num === 2) {
            await sendLastScrapedUserToServer(
              profile.href,
              pageDomain,
              timestamp
            );
          }
        }
      } else {
        console.log(`No profile found at num: ${num}`);
        break;
      }

      num++;
    } catch (error) {
      console.error(`Error processing profile at num: ${num}`, error);
      break;
    }
  }

  return { profileLinks, lastProcessedNum: num - 1, halted };
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
    console.error(
      'Error fetching the last scraped user from the server:',
      error
    );
    return null; // or any default value you prefer
  }
}

/**
 * Main function to scroll and extract profile links.
 * @returns {Promise<string[]>} - A promise that resolves with an array of unique profile links.
 */
async function extractProfileLinks() {
  const allProfileLinks = new Set();
  let lastProcessedNum = 1; // Start from 1 to account for num starting at 2
  const maxScrollAttempts = 5; // Max number of scroll attempts when no new profiles are found
  let noNewProfileAttempts = 0; // Counter for attempts with no new profiles

  await delay(2000);

  const currentDomain = window.location.href;
  const originDomain = window.location.origin;

  const xpathQuery = `//a[contains(@href, '${originDomain}') and contains(@href, 'reviews') and @role='tab']`;
  const reviewsTab = getElementByXPath(xpathQuery);
  if (reviewsTab) {
    reviewsTab.click();
    await delay(4000);
  }

  try {
    // Initial extraction without scrolling
    console.log('Extracting initial visible profiles');
    showTemporaryAlert(
      'Starting profile extraction',
      undefined,
      undefined,
      '#008000'
    );

    let result = await getAllProfileLinks(2, allProfileLinks, currentDomain);
    let {
      profileLinks,
      lastProcessedNum: newLastProcessedNum,
      halted
    } = result;
    console.log(result);
    profileLinks.forEach((link) => allProfileLinks.add(link));
    lastProcessedNum = newLastProcessedNum;

    while (!halted && noNewProfileAttempts < maxScrollAttempts) {
      const scrollAmount = getRandomNumber(2300, 4000);
      console.log(`Scrolling by ${scrollAmount}px`);
      await scrollByAmount(scrollAmount);

      // Wait for a short delay after scrolling
      console.log('Waiting for 3 seconds after scrolling');
      await delay(3000);

      // Fetch new profile links after scrolling
      result = await getAllProfileLinks(
        lastProcessedNum + 1,
        allProfileLinks,
        currentDomain
      );
      ({
        profileLinks,
        lastProcessedNum: newLastProcessedNum,
        halted
      } = result);

      if (profileLinks.length === 0) {
        noNewProfileAttempts++;
        console.log(
          `No new profiles found. Attempt ${noNewProfileAttempts}/${maxScrollAttempts}`
        );
      } else {
        profileLinks.forEach((link) => allProfileLinks.add(link));
        lastProcessedNum = newLastProcessedNum;
        noNewProfileAttempts = 0; // Reset the counter if new profiles are found
        console.log(
          `Profiles found: ${profileLinks.length}. Total unique profiles: ${allProfileLinks.size}`
        );
      }

      // Delay before next scroll
      const scrollDelay = getRandomNumber(5000, 10000);
      console.log(
        `Waiting for ${scrollDelay / 1000} seconds before next scroll`
      );
      await delay(scrollDelay);
    }

    const uniqueProfileLinks = Array.from(allProfileLinks);
    console.log('Finished extracting profile links.');
    showTemporaryAlert(
      `Finished scraping user profiles. Total profiles scraped: ${uniqueProfileLinks.length}`
    );
    await sendDataToServer(
      uniqueProfileLinks.length,
      currentDomain,
      Date.now()
    );
    return Promise.resolve(uniqueProfileLinks);
  } catch (error) {
    console.error('Error extracting profile links:', error);
    return Promise.reject(error); // Propagate the error to be handled by the caller
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
    const response = await fetch(
      'http://localhost:3000/mail/reportScrapeStats',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ scrapeCount, pageDomain, timestamp })
      }
    );

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

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

// Function to scroll to the bottom of the page
function scrollByAmount(amount) {
  return new Promise((resolve) => {
    const distance = 100; // distance to scroll on each step
    let scrolled = 0;

    const timer = setInterval(() => {
      window.scrollBy(0, distance);
      scrolled += distance;

      if (scrolled >= amount) {
        clearInterval(timer);
        resolve();
      }
    }, 100); // delay between each scroll step
  });
}

// Function to get all profile links with dynamic XPath, starting from lastProcessedNum
function getAllProfileLinks(lastProcessedNum) {
  const profileLinks = [];
  let num = lastProcessedNum + 1; // Start checking from div[num+1]

  while (true) {
    const xpath = `/html/body/div[1]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div/div[4]/div/div/div/div[${num}]/div/div/div/div/div/div/div/div/div/div[13]/div/div/div[2]/div/div[2]/div/div[1]/span/h2/span/strong[1]/span/a`;
    const profile = getElementByXPath(xpath);

    if (profile) {
      profileLinks.push(profile.href);
      num++;
    } else {
      break; // Exit the loop when no more elements are found
    }
  }

  return { profileLinks, lastProcessedNum: num - 1 };
}

// Main function to scroll and extract profile links
async function extractProfileLinks() {
  const scrollAmount = 1000; // Amount to scroll on each scroll step
  const allProfileLinks = new Set();
  let lastProcessedNum = 1; // Start from 1 to account for num starting at 2
  let maxScrollAttempts = 10; // Max number of scroll attempts when no new profiles are found
  let noNewProfileAttempts = 0; // Counter for attempts with no new profiles

  while (true) {
    const { profileLinks, lastProcessedNum: newLastProcessedNum } =
      getAllProfileLinks(lastProcessedNum);

    if (profileLinks.length === 0) {
      noNewProfileAttempts++;
      if (noNewProfileAttempts >= maxScrollAttempts) {
        break; // Stop if no new profiles found after max attempts
      }
      await scrollByAmount(scrollAmount);
    } else {
      profileLinks.forEach((link) => allProfileLinks.add(link));
      lastProcessedNum = newLastProcessedNum;
      noNewProfileAttempts = 0; // Reset the counter if new profiles are found
    }

    // Delay before next scroll (optional, adjust as needed)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Convert Set to Array to get unique profile links
  return Array.from(allProfileLinks);
}

// Start the process after a delay to ensure the page is fully loaded
setTimeout(() => {
  extractProfileLinks().then((profileLinks) => {
    console.log("All profile links:", profileLinks);
  });
}, 5000);

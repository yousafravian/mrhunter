// Function to get a random number between min and max (inclusive)
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

// Function to get all profile links with dynamic XPath, starting from a given num
function getAllProfileLinks(startNum, foundProfiles) {
    const profileLinks = [];
    let num = startNum;

    while (true) {
        const xpath = `/html/body/div[1]/div/div[1]/div/div[3]/div/div/div[1]/div[1]/div/div/div[4]/div/div/div/div[${num}]/div/div/div/div/div/div/div/div/div/div[13]/div/div/div[2]/div/div[2]/div/div[1]/span/h2/span/strong[1]/span/a`;
        const profile = getElementByXPath(xpath);

        if (profile && !foundProfiles.has(profile.href)) {
            profileLinks.push(profile.href);
            foundProfiles.add(profile.href);
            console.log(`Found profile link: ${profile.href} at num: ${num}`);
        } else {
            console.log(`No profile found at num: ${num}`);
            break;
        }
        num++;
    }

    return { profileLinks, lastProcessedNum: num - 1 };
}

async function sendProfileLinksToServer(profileLinks) {
    try {
        const response = await fetch('http://your-node-server-url/api/profile-links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ profileLinks }),
        });

        if (response.ok) {
            console.log('Profile links successfully sent to the server');
        } else {
            console.error('Failed to send profile links to the server');
        }
    } catch (error) {
        console.error('Error sending profile links to the server:', error);
    }
}

// Main function to scroll and extract profile links
async function extractProfileLinks() {
    const scrollAmount = getRandomNumber(1000, 3000);
    const allProfileLinks = new Set();
    let lastProcessedNum = 1; // Start from 1 to account for num starting at 2
    let maxScrollAttempts = 5; // Max number of scroll attempts when no new profiles are found
    let noNewProfileAttempts = 0; // Counter for attempts with no new profiles

    // Initial extraction without scrolling
    console.log('Extracting initial visible profiles');
    let { profileLinks, lastProcessedNum: newLastProcessedNum } = getAllProfileLinks(2, allProfileLinks);
    profileLinks.forEach((link) => allProfileLinks.add(link));
    lastProcessedNum = newLastProcessedNum;

    while (true) {
        console.log(`Scrolling by ${scrollAmount}px`);
        await scrollByAmount(scrollAmount);

        // Wait for 2 seconds after scrolling
        console.log('Waiting for 2 seconds after scrolling');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        ({ profileLinks, lastProcessedNum: newLastProcessedNum } = getAllProfileLinks(lastProcessedNum + 1, allProfileLinks));

        if (profileLinks.length === 0) {
            noNewProfileAttempts++;
            console.log(`No new profiles found. Attempt ${noNewProfileAttempts}/${maxScrollAttempts}`);
            if (noNewProfileAttempts >= maxScrollAttempts) {
                console.log('Reached maximum scroll attempts with no new profiles. Stopping.');
                break; // Stop if no new profiles found after max attempts
            }
        } else {
            profileLinks.forEach((link) => allProfileLinks.add(link));
            lastProcessedNum = newLastProcessedNum;
            noNewProfileAttempts = 0; // Reset the counter if new profiles are found
            console.log(`Profiles found: ${profileLinks.length}. Total unique profiles: ${allProfileLinks.size}`);
        }

        // Delay before next scroll
        const scrollDelay = getRandomNumber(5000, 10000);
        console.log(`Waiting for ${scrollDelay / 1000} seconds before next scroll`);
        await new Promise((resolve) => setTimeout(resolve, scrollDelay));
    }
    const uniqueProfileLinks = Array.from(allProfileLinks);

    // Convert Set to Array to get unique profile links
    console.log('Finished extracting profile links.');
    return uniqueProfileLinks;
}

// Start the process after a delay to ensure the page is fully loaded
setTimeout(() => {
    console.log('Starting profile link extraction');
    extractProfileLinks().then((profileLinks) => {
        console.log("All profile links:", profileLinks);
    });
}, 5000);

function populateDropdown(profile) {
  const dropdown = document.getElementById('profiles-dropdown');

  const option = document.createElement('option');
  option.value = profile.email;
  option.textContent = profile.email;
  dropdown.appendChild(option);
}

function addRow(name, count, link) {
  const tableBody = document.getElementById('table-body');

  // Create table row
  const row = document.createElement('tr');

  // Create cells
  const nameCell = document.createElement('td');
  nameCell.textContent = name;

  const countCell = document.createElement('td');
  countCell.textContent = count;
  countCell.classList.add('count');

  const actionCell = document.createElement('td');
  const input = document.createElement('input');
  input.type = 'text';
  input.classList.add('hidden');
  input.id = link;

  const button = document.createElement('button');
  button.textContent = 'Scrape';
  button.onclick = function () {
    handleButtonClick(input.id);
  };

  // Append input and button to action cell
  actionCell.appendChild(input);
  actionCell.appendChild(button);

  // Append cells to row
  row.appendChild(nameCell);
  row.appendChild(countCell);
  row.appendChild(actionCell);

  // Append row to table body
  tableBody.appendChild(row);
}

function handleButtonClick(inputId) {
  const pageLink = inputId;
  console.log(pageLink);
  chrome.runtime.sendMessage({ action: 'startScraping', link: pageLink });
}

function updateUI() {
  chrome.storage.local.get(null, (result) => {
    const loginButton = document.getElementById('login-button');
    if (Object.keys(result).length === 0) {
      if (loginButton) {
        loginButton.style.display = 'block'; // Show the login button
      }
    } else if (result.loggedIn) {
      if (loginButton) {
        loginButton.style.display = 'none'; // Hide the login button
      }
    } else {
      if (loginButton) {
        loginButton.style.display = 'block'; // Show the login button
      }
    }
  });
}

function updateScrapeCount(inputId, newCount) {
  const rows = document.querySelectorAll('#table-body tr');
  rows.forEach((row) => {
    const input = row.querySelector('input[type="text"]');
    if (input && input.id === inputId) {
      // Update the count value in the corresponding column
      const countCell = row.querySelector('.count');
      if (countCell) {
        countCell.textContent = newCount;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [pages, scrapedUsersCount] = await Promise.all([
      fetchData('http://localhost:3000/pages'),
      fetchData('http://localhost:3000/scraped_users/groupByPageDomain')
    ]);

    if (Array.isArray(pages) && Array.isArray(scrapedUsersCount)) {
      document.getElementById('loader').style.display = 'none';
      document.getElementById('content').style.display = 'block';
      pages.forEach((page) => {
        addRow(page.name, 0, page.link);
      });
      scrapedUsersCount.forEach((item) => {
        updateScrapeCount(item.pageDomain, item.scraped_users);
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

document.getElementById('startBot').addEventListener('click', async () => {
  const email = '';
  try {
    const credentialsToLogin = await fetchData(
      `http://localhost:3000/credentials/getValidationAndScrapingCredentials/${email}`
    );
    if (Object.entries(credentialsToLogin).length === 0) {
      resetStatus.textContent = "Wait two hours or reset"; // Failure message
      resetStatus.style.color = "red";
      resetStatus.style.display = "block";
      setTimeout(() => {
        resetStatus.style.display = "none";
      }, 4000);
      return;
    }
    // Send the credentials to background.js to start the bot
    chrome.runtime.sendMessage({ action: 'startBot', credentialsToLogin });
  } catch (error) {
    console.error('Error logging in:', error);
  }
});

document
  .getElementById("clearEvaluatedEmails")
  .addEventListener("click", async () => {
    const resetStatus = document.getElementById("resetStatus");
    resetStatus.style.display = "none";

    try {
      const response = await fetch(
        "http://localhost:3000/credentials/resetValidationTimestamps",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.text();
        resetStatus.textContent = "timestamps have been successfully reset!"; // Success message
        resetStatus.style.color = "green";
      } else {
        resetStatus.textContent = "Failed to reset timestamps."; // Failure message
        resetStatus.style.color = "red";
      }
    } catch (error) {
      console.error("Error:", error);
      resetStatus.textContent = "An error occurred while resetting timestamps.";
      resetStatus.style.color = "red";
    }
    resetStatus.style.display = "block";
    setTimeout(() => {
      resetStatus.style.display = "none";
    }, 5000);
  });

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}`);
  }
  return response.json();
}

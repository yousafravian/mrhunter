document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [pages, scrapedUsersCount] = await Promise.all([
      fetchData('http://localhost:3000/counts/unscrapedPagesCount'),
      fetchData('http://localhost:3000/counts/totalScrapedUsers')
    ]);

    document.getElementById('loader').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    document.getElementById('totalUsers').textContent =
      pages.count;
    document.getElementById('totalMessages').textContent =
      scrapedUsersCount.count;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

document.getElementById('startBot').addEventListener('click', async () => {
  try {
    chrome.runtime.sendMessage({ action: 'startBot' });
  } catch (error) {
    console.error('Error logging in:', error);
  }
});

// document
//   .getElementById('clearEvaluatedEmails')
//   .addEventListener('click', async () => {
//     const resetStatus = document.getElementById('resetStatus');
//     resetStatus.style.display = 'none';

//     try {
//       const response = await fetch(
//         'http://localhost:3000/credentials/resetSVCredentials',
//         {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json'
//           }
//         }
//       );

//       if (response.ok) {
//         const result = await response.text();
//         resetStatus.textContent = 'credentials have been successfully reset!'; // Success message
//         resetStatus.style.color = 'green';
//       } else {
//         resetStatus.textContent = 'Failed to reset credentials.'; // Failure message
//         resetStatus.style.color = 'red';
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       resetStatus.textContent =
//         'An error occurred while resetting credentials.';
//       resetStatus.style.color = 'red';
//     }
//     resetStatus.style.display = 'block';
//     setTimeout(() => {
//       resetStatus.style.display = 'none';
//     }, 5000);
//   });

async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}`);
  }
  return response.json();
}

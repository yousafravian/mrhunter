console.log("Content script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "login") {
    const form = document.querySelector('form._9vtf[data-testid="royal_login_form"]');
    if (form) {
      const emailField = form.querySelector('input[name="email"]');
      const passwordField = form.querySelector('input[name="pass"]');
      if (emailField && passwordField) {
        emailField.value = message.email;
        passwordField.value = message.password;
        form.submit();
        sendResponse({ success: true });
      } else {
        console.error('Email or password field not found');
        sendResponse({ success: false, error: 'Email or password field not found' });
      }
    } else {
      console.error('Login form not found');
      sendResponse({ success: false, error: 'Login form not found' });
    }
  } else if (message.action === 'search') {
    console.log('search message recieved');
    const searchBar = document.querySelector('input[aria-label="Search Facebook"][type="search"]');
    if (searchBar) {
      console.log('search bar found');
      searchBar.focus();
      searchBar.value = message.query;
      const event = new Event('input', { bubbles: true });
      searchBar.dispatchEvent(event);
    } else {
      console.log('search bar not found');
    }
  }
  return true;  // Indicate that we will send a response asynchronously
});

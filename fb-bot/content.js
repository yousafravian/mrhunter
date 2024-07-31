console.log("Content script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "login") {
    const form = document.querySelector(
      'form._9vtf[data-testid="royal_login_form"]'
    );
    if (form) {
      const emailField = form.querySelector('input[name="email"]');
      const passwordField = form.querySelector('input[name="pass"]');
      if (emailField && passwordField) {
        emailField.value = message.email;
        passwordField.value = message.password;
        form.submit();
        sendResponse({ success: true });
      } else {
        console.error("Email or password field not found");
        sendResponse({
          success: false,
          error: "Email or password field not found",
        });
      }
    } else {
      console.error("Login form not found");
      sendResponse({ success: false, error: "Login form not found" });
    }
  } else if (message.action === "search") {
    console.log("search message recieved");
    const searchBar = document.querySelector(
      'input[aria-label="Search Facebook"][type="search"]'
    );
    if (searchBar) {
      console.log("search bar found");
      searchBar.focus();
      setTimeout(() => {
        searchBar.value = message.query;
        const event = new Event("input", { bubbles: true });
        searchBar.dispatchEvent(event);
        const keyDownEvent = new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
        });
        searchBar.dispatchEvent(keyDownEvent);
        const keyUpEvent = new KeyboardEvent("keyup", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
        });
        searchBar.dispatchEvent(keyUpEvent);
        console.log("enter pressed");
        setTimeout(() => {
          console.log("search complete");
        }, 5000);
      }, 5000);
    } else {
      console.log("search bar not found");
    }
  } else if (message.action === "pageTraverse") {
    setTimeout(() => {
      console.log("page traversal");
    }, 5000);
  }
  return true; // Indicate that we will send a response asynchronously
});

console.log("Content script loaded");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "login") {
        const form = document.querySelector('form._9vtf[data-testid="royal_login_form"]');
        const emailField = form.querySelector('input[name="email"]');
        const passwordField = form.querySelector('input[name="pass"]');
        emailField.value = message.email;
        passwordField.value = message.password;
        form.submit();
  }
});

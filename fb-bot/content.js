  // chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  //   if (message.action === "login") {
  //     console.log("fired from content script");
  //     const form = document.querySelector(
  //       'form._9vtf[data-testid="royal_login_form"]'
  //     );
  //     if (form) {
  //       const emailField = form.querySelector('input[name="email"]');
  //       const passwordField = form.querySelector('input[name="pass"]');
  //       if (emailField && passwordField) {
  //         emailField.value = message.email;
  //         passwordField.value = message.password;
  //         form.submit();
  //       } else {
  //         console.error("Email or password field not found");
  //       }
  //     } else {
  //       console.error("Login form not found");
  //     }
  //   }
  // });

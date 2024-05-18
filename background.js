chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      function: analyzePage,
    },
    (results) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      } else {
        console.log("Page analyzed");
      }
    }
  );
});

function analyzePage() {
  const isCSR =
    !document.body.innerHTML.includes('<div id="root">') &&
    !document.body.innerHTML.includes('<div id="app">');
  const result = isCSR ? "Client-Side Rendered" : "Server-Side Rendered";

  // Display the result to the user
  alert(`This page is: ${result}`);
}

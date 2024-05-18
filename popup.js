document.getElementById("analyze").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        function: analyzePage,
      },
      (results) => {
        if (results && results[0] && results[0].result) {
          document.getElementById(
            "result"
          ).textContent = `This page is: ${results[0].result}`;
        } else {
          document.getElementById("result").textContent = "Analysis failed.";
        }
      }
    );
  });
});

function analyzePage() {
  const isCSR =
    !document.body.innerHTML.includes('<div id="root">') &&
    !document.body.innerHTML.includes('<div id="app">');
  return isCSR ? "Client-Side Rendered" : "Server-Side Rendered";
}

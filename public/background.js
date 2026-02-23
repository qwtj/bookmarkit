// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("bookmarkit extension installed.");
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

// URL validation — runs in the service worker context which bypasses CORS restrictions.
// Returns { status: 'valid'|'invalid', redirectUrl: string|null }
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "CHECK_URL") return false;
  const url = message.url;
  fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) })
    .then((res) => {
      const redirectUrl = res.url && res.url !== url ? res.url : null;
      sendResponse({ status: res.ok ? "valid" : "invalid", redirectUrl });
    })
    .catch(() => sendResponse({ status: "invalid", redirectUrl: null }));
  return true; // keep message channel open for async response
});

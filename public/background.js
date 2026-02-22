// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("bookmarkit extension installed.");
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

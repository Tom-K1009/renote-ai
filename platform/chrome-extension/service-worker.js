chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "tsumugu-refine",
    title: "TSUMUGUで整形",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "tsumugu-refine" || !info.selectionText) return;

  const url = new URL("https://tsumugu.example.com/app");
  url.searchParams.set("text", info.selectionText);
  chrome.tabs.create({ url: url.toString() });
});

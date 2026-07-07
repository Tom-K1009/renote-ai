chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "renote-refine",
    title: "Renote AIで整形",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "renote-refine" || !info.selectionText) return;

  const url = new URL("https://renote-ai.example.com/app");
  url.searchParams.set("text", info.selectionText);
  chrome.tabs.create({ url: url.toString() });
});

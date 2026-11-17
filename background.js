/*console.log("Fetching AI artist data...");

fetch("https://raw.githubusercontent.com/xoundbyte/soul-over-ai/main/dist/artists.json")
  .then(response => response.json())
  .then(data => {
    const artistNames = data.map(artist => artist.name.toLowerCase());

    chrome.storage.local.set({ aiArtist: artistNames }, () => {
      console.log("Saved", artistNames.length, "artists to storage");
    });

    function isAIArtist(artistName) {
      const LowerCaseName = artistName.toLowerCase();

      return artistNames.includes(LowerCaseName, data);
    }
  });
  */
// old logic from simpler times

// Just listening for the page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'open-settings') {
    // Opens the options_page or options_ui defined in manifest.json
    chrome.runtime.openOptionsPage(() => {
      sendResponse({ status: 'opened' });
    });

    // Return true to keep the message channel open for the async sendResponse
    return true;
  }
});


function DecideBadge(AIwidth, humanWidth, selector, badgeLocation){
    
chrome.storage.local.get('aiArtist', (result) => {


    const artistNames = result.aiArtist || [];
    console.log("Loaded", artistNames.length, "AI artists from storage");

    const artistElement = document.querySelector(selector)


           if (artistElement) {
            const artist = artistElement.textContent.trim();

            const isAI = artistNames.includes(artist.toLowerCase());

        console.log("Is AI?", isAI)     
        if (isAI) {
             ShowWarningBadge(AIwidth, badgeLocation);
        }else{
            ShowHumanBadge(humanWidth, badgeLocation);
        }
    } else {
        console.log("Artist element not found");
    }


});
    
}



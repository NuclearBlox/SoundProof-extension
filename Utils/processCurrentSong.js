

function DecideBadge(AIwidth, humanWidth, selector, badgeLocation, skipElement){
    
chrome.storage.local.get('aiArtist', (result) => {


    const artistNames = result.aiArtist || [];
    console.log("Loaded", artistNames.length, "AI artists from storage");

    const artistElement = document.querySelector(selector)


           if (artistElement) {
            let artist = artistElement.textContent.trim();

            const isAI = artistNames.includes(artist.toLowerCase());

        console.log("Is AI?", isAI)     
        if (isAI) {
             ShowWarningBadge(AIwidth, badgeLocation, artist);
            chrome.storage.local.get('skipAI', (result) => {
            var skipAI = result.skipAI || false;
            if (skipAI === true) {
                Skip(skipElement);
            }
        });

        }else{
            ShowHumanBadge(humanWidth, badgeLocation, artist);
        }
    } else {
        console.log("Artist element not found");
    }


});
    
}

function Skip(skipElement) {
    skipElement.click();
    console.log("Skipped song");
}

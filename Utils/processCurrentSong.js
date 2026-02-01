

function DecideBadge(AIwidth, humanWidth, selector, badgeLocation, skipButton){
    
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
             Skip(skipButton);
        }else{
            ShowHumanBadge(humanWidth, badgeLocation, artist);
            Skip(skipButton);
        }
    } else {
        console.log("Artist element not found");
    }


});
    
}

function Skip(skipButton) {
    const buttons = document.querySelectorAll('#button');
    const nextButton = Array.from(buttons).find(el => el.textContent.trim() === skipButton);
    nextButton?.click();
    console.log("Skipped song");
}

console.log("loaded on youtube music!")

let currentArtist = null;

const nextButton = document.querySelector('tp-yt-paper-icon-button[aria-label="Next song"]') || document.querySelector('.next-button');

function checkAndUpdateBadge() {
    const artistElement = document.querySelector('.subtitle.ytmusic-player-bar a');
    
    if (artistElement) {
        const newArtist = artistElement.textContent.trim();
        
        if (newArtist !== currentArtist) {
            
            console.log("Artist changed from", currentArtist, "to", newArtist);
            currentArtist = newArtist;
            DecideBadge('75px', '50px', '.subtitle.ytmusic-player-bar a', '#left-controls > span', nextButton);
        }
    }
}


function observeArtistElement() {
    const artistElement = document.querySelector('.subtitle.ytmusic-player-bar a');
    
    if (artistElement) {
        const observer = new MutationObserver(() => {
            checkAndUpdateBadge();
        });
        
        observer.observe(artistElement, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        checkAndUpdateBadge();
    } else {
        setTimeout(observeArtistElement, 500);
    }
}

observeArtistElement();
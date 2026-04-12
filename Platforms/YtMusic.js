// Platform check - only run on YouTube Music
if (!window.location.hostname.includes('music.youtube.com')) {
    console.warn('YtMusic.js loaded on wrong platform:', window.location.hostname);
    throw new Error('YtMusic.js is only for YouTube Music');
}

console.log("loaded on youtube music!")

let currentArtist = null;
let currentTitle = null;

const nextButton = document.querySelector('tp-yt-paper-icon-button[aria-label="Next song"]') || document.querySelector('.next-button');

function checkAndUpdateBadge() {
    const artistElement = document.querySelector('.subtitle.ytmusic-player-bar a');
    const titleElement = document.querySelector('.title.ytmusic-player-bar');
    
    if (artistElement && titleElement) {
        const newArtist = artistElement.textContent.trim();
        const newTitle = titleElement.textContent.trim();
        
        if (newArtist !== currentArtist || newTitle !== currentTitle) {
            console.log("Song changed:", currentTitle, "by", currentArtist, "->", newTitle, "by", newArtist);
            currentArtist = newArtist;
            currentTitle = newTitle;
            DecideBadge('90px', '50px', '.subtitle.ytmusic-player-bar a', '#left-controls > span', nextButton, 'auto');
        }
    }
}

function observePlayerBar() {
    const playerBar = document.querySelector('ytmusic-player-bar');
    
    if (playerBar) {
        const observer = new MutationObserver(() => {
            checkAndUpdateBadge();
        });
        
        observer.observe(playerBar, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });
        
        const videoElement = document.querySelector('video');
        if (videoElement) {
            let lastCheck = 0;
            videoElement.addEventListener('timeupdate', () => {
                if (videoElement.currentTime - lastCheck > 2 || videoElement.currentTime < lastCheck) {
                    lastCheck = videoElement.currentTime;
                    checkAndUpdateBadge();
                }
            });
        }
        
        // Initial check
        checkAndUpdateBadge();
    } else {
        setTimeout(observePlayerBar, 500);
    }
}

observePlayerBar();
console.log("loaded on spotify")

let currentArtist = null;
let currentTitle = null;

const nextButton = document.querySelector('#main > div > div.iRGr6yO6lPcAKUoT > div.YdGOYWQYr6kqh7KU > aside > div > div.bGZUhy7AJlUgdvzB > div > div.kBq3sMkivgMPe5qr > div.O9zMd8LexCQNrpv5 > button:nth-child(1)');

function checkAndUpdateBadge() {
    const artistElement = document.querySelector('#main > div > div.iRGr6yO6lPcAKUoT > div.YdGOYWQYr6kqh7KU > aside > div > div.ZJCXNvTeX4pAS9rt > div > div.KN5KA9u52qQprYjq.PZqkGvH2tH8xbDWT > div.xSfZMAalZIg2nzIs > div > span > span > div > span > a');
    const titleElement = document.querySelector('#main > div > div.iRGr6yO6lPcAKUoT > div.YdGOYWQYr6kqh7KU > aside > div > div.ZJCXNvTeX4pAS9rt > div > div.KN5KA9u52qQprYjq.PZqkGvH2tH8xbDWT > div.fOSYRD0ZQ7wnd6Y4 > div > span > span > div > span > a');
    
    if (artistElement && titleElement) {
        const newArtist = artistElement.textContent.trim();
        const newTitle = titleElement.textContent.trim();
        
        if (newArtist !== currentArtist || newTitle !== currentTitle) {
            console.log("Song changed:", currentTitle, "by", currentArtist, "->", newTitle, "by", newArtist);
            currentArtist = newArtist;
            currentTitle = newTitle;
            
            DecideBadge('75px', '50px', '#main > div > div.iRGr6yO6lPcAKUoT > div.YdGOYWQYr6kqh7KU > aside > div > div.ZJCXNvTeX4pAS9rt > div > div.KN5KA9u52qQprYjq.PZqkGvH2tH8xbDWT > div.xSfZMAalZIg2nzIs > div > span > span > div > span > a', '#main > div > div.iRGr6yO6lPcAKUoT > div.YdGOYWQYr6kqh7KU > aside > div > div.ZJCXNvTeX4pAS9rt > div > div.mD6MFF1cf5MA9Uhb', nextButton, '0px');
        }
    }
}

function observePlayerBar() {
    const playerBar = document.querySelector('#main > div > div.iRGr6yO6lPcAKUoT > div.YdGOYWQYr6kqh7KU > aside > div > div.ZJCXNvTeX4pAS9rt > div');
    
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
        
        const videoElement = document.querySelector('video') || document.querySelector('audio');
        if (videoElement) {
            let lastCheck = 0;
            videoElement.addEventListener('timeupdate', () => {
                if (videoElement.currentTime - lastCheck > 2 || videoElement.currentTime < lastCheck) {
                    lastCheck = videoElement.currentTime;
                    checkAndUpdateBadge();
                }
            });
        }
        
        checkAndUpdateBadge();
    } else {
        setTimeout(observePlayerBar, 500);
    }
}

observePlayerBar();
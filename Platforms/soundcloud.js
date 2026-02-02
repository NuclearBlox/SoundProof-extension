console.log("loaded on SoundCloud!");

let currentArtist = null;
let currentTitle = null;

// Helper function to add padding wrapper
function DecideBadgeWithPadding(width, height, selector, location, skipBtn, paddingLeft = '10px') {
    const existingWrapper = document.querySelector('.ai-badge-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-badge-wrapper';
    wrapper.style.paddingLeft = paddingLeft;
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.height = '100%';
   
    const targetLocation = document.querySelector(location);
    if (targetLocation) {
        targetLocation.appendChild(wrapper);
    }
    

    DecideBadge(width, height, selector, '.ai-badge-wrapper', skipBtn);
}

function checkAndUpdateBadge() {
    const artistElement = document.querySelector('.playbackSoundBadge__titleContextContainer > a');
    const titleElement = document.querySelector('.playbackSoundBadge__titleContextContainer span:nth-child(2)');
    
    if (artistElement && titleElement) {
        const newArtist = artistElement.textContent.trim();
        const newTitle = titleElement.textContent.trim();
        
        if (newArtist !== currentArtist || newTitle !== currentTitle) {
            console.log("Song changed:", currentTitle, "by", currentArtist, "->", newTitle, "by", newArtist);
            currentArtist = newArtist;
            currentTitle = newTitle;
            

            setTimeout(() => {

                const nextButton = document.querySelector('.skipControl__next');
                
                if (nextButton) {
                    console.log("Next button found:", nextButton);
                } else {
                    console.log("Next button NOT found!");
                }
                
                DecideBadgeWithPadding(
                    '60px', 
                    '35px', 
                    '.playbackSoundBadge__titleContextContainer > a',
                    '.playbackSoundBadge__actions',
                    nextButton,
                    '30px'
                );
            }, 100);
        }
    }
}

function observePlayerBar() {
    const playerBar = document.querySelector('.playControls');
    
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
        
        setTimeout(checkAndUpdateBadge, 1000);
    } else {
        setTimeout(observePlayerBar, 500);
    }
}

observePlayerBar();
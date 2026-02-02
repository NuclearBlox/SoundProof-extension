console.log("loaded on SoundCloud!");

let currentArtist = null;
let currentTitle = null;

const nextButton = document.querySelector('.skipControl__next');

// Helper function to add padding wrapper
function DecideBadgeWithPadding(width, height, selector, location, skipBtn, paddingLeft = '10px') {
    // Remove existing badge wrapper if it exists
    const existingWrapper = document.querySelector('.ai-badge-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }
    
    // Create wrapper with padding
    const wrapper = document.createElement('div');
    wrapper.className = 'ai-badge-wrapper';
    wrapper.style.paddingLeft = paddingLeft;
    wrapper.style.display = 'inline-block';
    
    // Insert wrapper into the target location
    const targetLocation = document.querySelector(location);
    if (targetLocation) {
        targetLocation.appendChild(wrapper);
    }
    
    // Call DecideBadge with the wrapper as the location
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
            
            // Wait a bit to ensure element is accessible
            setTimeout(() => {
                DecideBadgeWithPadding(
                    '60px', 
                    '35px', 
                    '.playbackSoundBadge__titleContextContainer > a',
                    '.playbackSoundBadge__actions',
                    nextButton,
                    '15px'  // ← Adjust this padding value as needed
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
        
        // Initial check with delay for SoundCloud's slower load
        setTimeout(checkAndUpdateBadge, 1000);
    } else {
        setTimeout(observePlayerBar, 500);
    }
}

observePlayerBar();
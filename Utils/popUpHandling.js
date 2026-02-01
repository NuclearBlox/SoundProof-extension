

async function getArtistData(artistName) {
    const response = await fetch('https://raw.githubusercontent.com/xoundbyte/soul-over-ai/main/dist/artists.json');
    const allArtists = await response.json();
    

    const artistData = allArtists.find(artist => 
        artist.name.toLowerCase() === artistName.toLowerCase()
    );
    
    return artistData; 
}



let hideTimer;

async function showPopup(container, badge, human, artist) {
clearTimeout(hideTimer);
if (document.body.querySelector('.ai-popup')) return;

    
    const HoverUI = chrome.runtime.getURL('Utils/warning.html');
    
    const response = await fetch(HoverUI);
    const hoverHTML = await response.text();

    const popup = document.createElement('div');
    popup.className = 'ai-popup';
    popup.innerHTML = hoverHTML;

    const rect = badge.getBoundingClientRect();

 popup.style.cssText = `
        position: fixed;
        left: ${rect.left + (rect.width / 2)}px;
        top: ${rect.top - 350}px;
        transform: translateX(-50%);
        width: 300px;
        padding: 15px;
        border-radius: 12px;
        z-index: 2147483647;
        
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        pointer-events: auto; 
    `;

    popup.addEventListener('mouseenter', () => {
        clearTimeout(hideTimer);
    });

    popup.addEventListener('mouseleave', () => {
        hidePopup();
    });







    // Deal with giving the UI the correct info

    const artistJson = await getArtistData("1950 SoulClub");

    document.body.appendChild(popup);

    popup.querySelector('#popup-artist-name').textContent = artistJson.name;
    if (artistJson.markerNotes && artistJson.markerNotes !== "") {
        popup.querySelector('#body > div.ai-popup > div > div.description').textContent = artistJson.markerNotes;
    } else {
        popup.querySelector('#body > div.ai-popup > div > div.description').textContent = "No additional information available.";
    }
}



function hidePopup() {
    hideTimer = setTimeout(() => {
        const popup = document.querySelector('.ai-popup');
        if (popup) {
            popup.remove();
        }
    }, 100); 
}

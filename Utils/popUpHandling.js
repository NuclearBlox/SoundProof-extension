

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
    const existingPopup = document.body.querySelector('.ai-popup');
    if (existingPopup) {
        existingPopup.remove();
    }
    
try {
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
        top: ${rect.top - 250}px;
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


    document.body.appendChild(popup);

    if (human === true) {

    popup.querySelector('#popup-artist-name').textContent = artist;
    popup.querySelector('.status-label').textContent = "Looks human!";
    const tagsContainer = popup.querySelector('.tags-container');
    tagsContainer.innerHTML = '';
    popup.querySelector('.description').textContent = "This artist is not listed on SoulOverAI. If it isnt suspicious it is probably human!";

    const button = popup.querySelector('.button-primary');
    button.textContent = "Report to SoulOverAI";
    button.onclick = () => {
        window.open(`https://souloverai.com/add`, '_blank');
    };

    } else {

    const artistJson = await getArtistData(artist);

    popup.querySelector('#popup-artist-name').textContent = artistJson.name;

    if (artistJson.markerNotes && artistJson.markerNotes !== "") {
        popup.querySelector('.description').textContent = artistJson.markerNotes;
    } else {
        popup.querySelector('.description').textContent = "No additional information available.";
    }
    popup.querySelector('.status-label').textContent = "AI artist!!";
        // 3. SET THE TAGS
    const tagsContainer = popup.querySelector('.tags-container');
    tagsContainer.innerHTML = ''; // Clear the default tags
    
    // artistJson.markers is an array like ["ai-visuals", "anonymous"]
    artistJson.markers.forEach(marker => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = marker;
        tagsContainer.appendChild(tag);
    });

        const button = popup.querySelector('.button-primary');
            button.textContent = "View on SoulOverAI";
    button.onclick = () => {
        window.open(`https://souloverai.com/artist/${artistJson.id}`, '_blank');
    };


    }

    } catch (err) {
        console.error("Popup failed to load:", err);
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

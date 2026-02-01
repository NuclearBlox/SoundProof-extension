
let hideTimer;

async function showPopup(container, badge, human, data) {
clearTimeout(hideTimer);
if (document.body.querySelector('.ai-popup')) return;

    
    const HoverUI = chrome.runtime.getURL('Utils/Hover.html');
    
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

    










    
    document.body.appendChild(popup);

}



function hidePopup() {
    // Instead of deleting immediately, we wait 100ms
    // This gives the mouse time to travel across the gap
    hideTimer = setTimeout(() => {
        const popup = document.querySelector('.ai-popup');
        if (popup) {
            popup.remove();
        }
    }, 100); 
}

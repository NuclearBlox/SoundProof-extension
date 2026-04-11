const style = document.createElement('style');
style.textContent = `
  @keyframes glow-pulse {
    0%   { filter: sepia(1) hue-rotate(-50deg) saturate(5) brightness(1)   drop-shadow(0 0 15px rgba(255,0,0,0.8)) drop-shadow(0 0 30px rgba(255,0,0,0.5)); }
    50%  { filter: sepia(1) hue-rotate(-50deg) saturate(7) brightness(1.3) drop-shadow(0 0 25px rgba(255,0,0,1))   drop-shadow(0 0 50px rgba(255,0,0,0.8)); }
    100% { filter: sepia(1) hue-rotate(-50deg) saturate(5) brightness(1)   drop-shadow(0 0 15px rgba(255,0,0,0.8)) drop-shadow(0 0 30px rgba(255,0,0,0.5)); }
  }
`;
document.head.appendChild(style);

function getPlacement(selector) {
    if (typeof selector === 'string') return document.querySelector(selector);
    return selector;
}

function makeContainer(className, padding, width) {
    const container = document.createElement('div');
    container.className = className;
    container.style.cssText = `position:relative;display:inline-block;margin:0px ${padding};width:${width};cursor:pointer`;
    return container;
}

function makeBadge(src, width) {
    const badge = document.createElement('img');
    badge.src = chrome.runtime.getURL(src);
    badge.style.cssText = `width:${width};height:auto;display:block;z-index:9999`;
    return badge;
}

function attachPopup(container, badge, human, artist) {
    container.addEventListener('mouseenter', () => showPopup(container, badge, human, artist));
    container.addEventListener('mouseleave', () => hidePopup());
}

function insertBadge(container, placement) {
    placement.parentElement.insertBefore(container, placement.nextSibling);
}

function ShowWarningBadge(width, selector, artist, padding, removePrev = true, isLean = false, isVerified = false) {
    const placement = getPlacement(selector);
    if (!placement) return;
    if (removePrev) RemoveBadges();

    const container = makeContainer('ai-warning-container', padding, width);
    const src = isVerified ? 'Badges/AIVerified.png' : isLean ? 'Badges/leanAI.png' : 'Badges/AI.png';
    const badge = makeBadge(src, width);

    if (!isLean && !isVerified) {
        badge.style.filter = 'sepia(1) hue-rotate(-50deg) saturate(5) brightness(1) drop-shadow(0 0 15px rgba(255,0,0,0.8)) drop-shadow(0 0 30px rgba(255,0,0,0.5))';
        badge.style.animation = 'glow-pulse 2s ease-in-out infinite';
    }

    container.appendChild(badge);
    attachPopup(container, badge, false, artist);
    insertBadge(container, placement);
    return badge;
}

function ShowHumanBadge(width, selector, artist, padding, removePrev = true, isLean = false, isVerified = false) {
    const placement = getPlacement(selector);
    if (!placement) return;
    if (removePrev) RemoveBadges();

    const container = makeContainer('human-container', padding, width);
    const src = isVerified ? 'Badges/HumanVerified.png' : isLean ? 'Badges/leanHuman.png' : 'Badges/Human.png';
    const badge = makeBadge(src, width);
    badge.style.opacity = '0.75';

    container.appendChild(badge);
    attachPopup(container, badge, true, artist);
    insertBadge(container, placement);
    return badge;
}

function ShowNoDataBadge(width, selector, artist, padding, removePrev = true) {
    const placement = getPlacement(selector);
    if (!placement) return;
    if (removePrev) RemoveBadges();

    const container = makeContainer('human-container', padding, width);
    const badge = makeBadge('Badges/NoData.png', width);
    badge.style.opacity = '0.5';

    container.appendChild(badge);
    attachPopup(container, badge, true, artist);
    insertBadge(container, placement);
    return badge;
}

function RemoveBadges() {
    document.querySelectorAll('.ai-warning-container, .human-container, .ai-popup').forEach(el => el.remove());
}
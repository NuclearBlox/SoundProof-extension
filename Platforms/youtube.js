if (!window.location.hostname.includes('youtube.com') || window.location.hostname.includes('music.youtube.com')) {
    console.warn('YouTube.js loaded on wrong platform:', window.location.hostname);
    throw new Error('YouTube.js is only for regular YouTube');
}

console.log("loaded on youtube!");

let currentUrl = null;

function getSkipButton() {
    return document.querySelector('#top-level-buttons-computed > segmented-like-dislike-button-view-model > yt-smartimation > div > div > dislike-button-view-model > toggle-button-view-model > button-view-model > button');
}

function checkAndUpdateBadge() {
    const badgeLocation = document.querySelector('#title > h1 > yt-formatted-string');
    if (!badgeLocation) {
        setTimeout(checkAndUpdateBadge, 500);
        return;
    }

    // Get the #channel-name link that actually has text
    const artistLinks = document.querySelectorAll('#channel-name a');
    const artist = Array.from(artistLinks).find(el => el.textContent.trim() !== '');
    if (!artist) {
        setTimeout(checkAndUpdateBadge, 500);
        return;
    }

    const skipButton = getSkipButton();
    DecideBadge('40px', '40px', '#channel-name a[href^="/@"]:not(:empty)', '#title > h1 > yt-formatted-string', skipButton, '15px', "video");
}

function onNavigate() {
    const newUrl = window.location.href;
    if (newUrl === currentUrl) return;
    currentUrl = newUrl;

    RemoveBadges();

    if (!window.location.pathname.startsWith('/watch')) return;

    setTimeout(checkAndUpdateBadge, 1500);
}

window.addEventListener('yt-navigate-finish', onNavigate);

if (window.location.pathname.startsWith('/watch')) {
    setTimeout(checkAndUpdateBadge, 1500);
}
window.DecideBadge = async function(AIwidth, humanWidth, selector, badgeLocation, skipElement, padding, platformClass, songTitle) {
    const artistElement = Array.from(document.querySelectorAll(selector)).find(el => el.textContent.trim() !== '') ?? document.querySelector(selector);
    if (!artistElement) return;

    // Use stamped handle if present (e.g. YouTube), otherwise fall back to display name
    const artistName = (artistElement.dataset.soundproofId || artistElement.textContent.trim()).toLowerCase();

    const status = await getArtistStatus(artistName, platformClass, false);

    if (status.out_verified) { // if its verified just set it to a bazilion votes because it doesnt matter
        if (status.out_ai > status.out_human) {
            status.out_ai = 10000000;
            console.log(`[SoundProof] ${artistName} is verified AI. Setting out_ai to 10,000,000.`);
        } else {
            status.out_human = 10000000;
            console.log(`[SoundProof] ${artistName} is verified Human. Setting out_human to 10,000,000.`);
        }
    }

    const total = status.out_human + status.out_ai;

    let badge;
    let isAI = false;
    let tugPct = 0;

    if (total === 0) {
        badge = ShowNoDataBadge(humanWidth, badgeLocation, artistName, padding, true, platformClass, songTitle);
    } else {
        isAI = status.out_ai > status.out_human;
        const winningSideVotes = isAI ? status.out_ai : status.out_human;
        const confidencePct = Math.round((winningSideVotes / total) * 100);
        tugPct = Math.round((Math.abs(status.out_ai - status.out_human) / total) * 100);
        const isLean = confidencePct < 75 || total <= 5;
        const isVerified = status.out_verified;

        console.log(`[SoundProof] ${artistName} is ${isAI ? 'AI' : 'Human'} (${status.out_ai} AI vs ${status.out_human} Human, ${confidencePct}% confidence, ${tugPct}% tug)`);

        badge = isAI
            ? ShowWarningBadge(AIwidth, badgeLocation, artistName, padding, true, isLean, isVerified, platformClass, songTitle)
            : ShowHumanBadge(humanWidth, badgeLocation, artistName, padding, true, isLean, isVerified, platformClass, songTitle);
    }

    if (skipElement) {
        // 'white', 'black', or false. 'black' also covers personal blocks
        // (artist, song, or a word in the title), which needs songTitle.
        const localStatus = await getLocalStatus(artistName, platformClass, songTitle);

        let effectiveTug = tugPct;
        if (localStatus === 'black') {
            effectiveTug = 100;
            isAI = true;
        } else if (localStatus === 'white') {
            effectiveTug = 0;
        }

        const { minVotes } = await chrome.storage.local.get('minVotes');
        if (localStatus || total >= (minVotes ?? 3)) {
            let { threshold } = await chrome.storage.local.get('threshold');
            threshold = Number(threshold ?? 50);
            if (isAI && effectiveTug >= threshold) {
                console.log(`[SoundProof] Skipping ${artistName} — ${effectiveTug}% AI pull, threshold ${threshold || 50}%`);
                skipElement.click();
            }
        }
    }

    return badge;
};
window.DecideBadge = async function(AIwidth, humanWidth, selector, badgeLocation, skipElement, padding) {
    const artistElement = document.querySelector(selector);
    if (!artistElement) return;

    let artistName = artistElement.textContent.trim();

    try {
        const { data, error } = await window.supabaseClient.rpc('get_artist_status', {
            target_id: artistName
        });

        const status = (data && data[0]) ? data[0] : { out_human: 0, out_ai: 0, out_score: 0, out_verified: false };

        const total = status.out_human + status.out_ai;

        if (total === 0) {
            ShowNoDataBadge(humanWidth, badgeLocation, artistName, padding);
            return;
        }

        const isAI = status.out_ai > status.out_human;
        const winningSideVotes = isAI ? status.out_ai : status.out_human;
        const confidencePct = Math.round((winningSideVotes / total) * 100);
        const tugPct = Math.round((Math.abs(status.out_ai - status.out_human) / total) * 100);
        const isLean = confidencePct < 75 || total <= 5;
        const isVerified = status.out_verified;

        if (isAI) {
            ShowWarningBadge(AIwidth, badgeLocation, artistName, padding, true, isLean, isVerified);

            if (total >= 3 && skipElement) {
                const { threshold } = await chrome.storage.local.get('threshold');
                if (tugPct >= (threshold || 50)) {
                    console.log(`[SoundProof] Skipping ${artistName} — ${tugPct}% AI pull, threshold ${threshold || 50}%`);
                    skipElement.click();
                }
            }
        } else {
            ShowHumanBadge(humanWidth, badgeLocation, artistName, padding, true, isLean, isVerified);
        }
    } catch (err) {
        console.error("Supabase Error:", err);
        ShowNoDataBadge(humanWidth, badgeLocation, artistName, padding);
    }
};